const fs = require("fs");
const csv = require("csv-parser");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const rateLimit = require("express-rate-limit");


const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors(
    {
        origin: "https://city-data-org.vercel.app" || "http://localhost:5173",
        credentials: true
    }
));
app.use(express.json());

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50,                 // 50 requests per IP per window
    standardHeaders: true,   // Return rate limit info in headers
    legacyHeaders: false,
    message: {
        error: "Too many requests. Please try again later."
    }
});


const OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.nchc.org.tw/api/interpreter"
];

async function safeFetch(url, options = {}) {
    const res = await fetch(url, options);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Fetch failed (${res.status}): ${text}`);
    }
    return res.json();
}

async function fetchOverpass(query) {
    for (const url of OVERPASS_ENDPOINTS) {
        try {
            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "text/plain",
                    "User-Agent": "CityData.org/1.0"
                },
                body: query.trim()
            });
            if (!res.ok) throw new Error();
            return await res.json();
        } catch {
            console.warn(`Overpass failed: ${url}`);
        }
    }
    throw new Error("All Overpass endpoints failed");
}


app.get("/api", apiLimiter, async (req, res) => {
    try {
        const cityName = req.query.city;
        if (!cityName) {
            return res.status(400).json({ error: "City is required" });
        }

        /* -----------------------------
           1. CITY SEARCH (NOMINATIM)
        ----------------------------- */
        const nominatimURL = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            cityName
        )}&countrycodes=in&limit=1`;

        const [city] = await safeFetch(nominatimURL);
        if (!city) throw new Error("City not found");

        const lat = Number(city.lat);
        const lon = Number(city.lon);

        console.log(`Fetching data for ${city.display_name} (${lat}, ${lon})`);

        /* -----------------------------
           2. WEATHER (OPEN-METEO)
        ----------------------------- */
        const weatherURL = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
        const weather = await safeFetch(weatherURL);

        console.log(`Weather data fetched`, weather);

        /* -----------------------------*/


        function getLocationStats(searchValue) {
            return new Promise((resolve, reject) => {
                const query = searchValue.trim().toLowerCase();
                console.log(`Searching location stats for: ${query}`);
                let resolved = false;

                const stream = fs
                    .createReadStream("data/final_cities.csv")
                    .pipe(csv());

                stream.on("data", (row) => {
                    if (resolved) return;

                    const city = row.City?.trim().toLowerCase();
                    const district = row.District?.trim().toLowerCase();
                    const state = row.State?.trim().toLowerCase();

                    let matchedOn = null;
                    let name = null;

                    if (city === query) {
                        matchedOn = "city";
                        name = row.City;
                    } else if (district === query) {
                        matchedOn = "district";
                        name = row.District;
                    } else if (state === query) {
                        matchedOn = "state";
                        name = row.State;
                    }

                    if (matchedOn) {
                        resolved = true;
                        stream.destroy(); // 🔥 stop reading file

                        return resolve({
                            population: Number(row.Population) || 0,
                            area: Number(row.Area) || 0,
                            matchedOn,
                            name,
                        });
                    }
                });

                stream.on("end", () => {
                    if (!resolved) {
                        reject(new Error("No matching state, district, or city found"));
                    }
                });

                stream.on("error", reject);
            });
        }
        console.log(`Fetching location stats for ${city.display_name.split(",")[0].trim()}`);
        const locationStats = await getLocationStats(
            city.display_name.split(",")[0].trim()
        );

        /* -----------------------------*/
        function categorizeAQI(aqi) {
            if (aqi === null || aqi === undefined) return "No data";
            if (aqi <= 50) return "Good";
            if (aqi <= 100) return "Moderate";
            if (aqi <= 150) return "Unhealthy for Sensitive Groups";
            if (aqi <= 200) return "Unhealthy";
            if (aqi <= 300) return "Very Unhealthy";
            return "Hazardous";
        }

        // ----------------------
        // GET CURRENT AQI (WAQI)
        // ----------------------
        async function getCurrentAQI(lat, lon) {
            try {
                const token = process.env.TOKEN;
                console.log(token)
                const url = `https://api.waqi.info/feed/geo:${lat};${lon}/?token=${token}`;
                const res = await fetch(url);
                const data = await res.json();

                if (data.status !== "ok" || !data.data) {
                    console.warn("WAQI: No data for coordinates");
                    return {
                        aqi: null,
                        category: "No data",
                        pollutants: {},
                        dominentPollutant: null,
                        time: null
                    };
                }

                const iaqi = data.data.iaqi || {};
                return {
                    aqi: data.data.aqi,
                    category: categorizeAQI(data.data.aqi),
                    pollutants: {
                        pm25: iaqi.pm25?.v ?? null,
                        pm10: iaqi.pm10?.v ?? null,
                        no2: iaqi.no2?.v ?? null,
                        so2: iaqi.so2?.v ?? null,
                        o3: iaqi.o3?.v ?? null,
                        co: iaqi.co?.v ?? null
                    },
                    dominentPollutant: data.data.dominentpol || null,
                    time: data.data.time?.s || null
                };
            } catch (err) {
                console.error("WAQI Fetch Error:", err.message);
                return {
                    aqi: null,
                    category: "No data",
                    pollutants: {},
                    dominentPollutant: null,
                    time: null
                };
            }
        }

        // ----------------------
        // GET AQI HISTORY (Open-Meteo PM2.5)
        // ----------------------
        async function getAQIHistory(lat, lon) {
            try {
                const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm2_5`;
                const res = await fetch(url);
                const data = await res.json();

                if (!data.hourly || !data.hourly.pm2_5) return [];

                // Map hourly PM2.5 values to AQI estimate
                return data.hourly.pm2_5.map((pm25, idx) => ({
                    timestamp: data.hourly.time[idx],
                    pm25,
                    aqi: categorizeAQI(pm25)
                }));
            } catch (err) {
                console.error("AQI History Fetch Error:", err.message);
                return [];
            }
        }

        // ----------------------
        // COMBINED FUNCTION
        // ----------------------
        async function getAQISection(lat, lon) {
            const current = await getCurrentAQI(lat, lon);
            const history = await getAQIHistory(lat, lon);

            return {
                currentAQI: current,
                history
            };
        }
        let airQualityString = "";
        (async () => {
            const airQuality = await getAQISection(lat, lon);
            airQualityString = airQuality
        })();

        /* -----------------------------
           4. INFRASTRUCTURE (OSM)
        ----------------------------- */
        const infraQuery = `
[out:json][timeout:25];
(
  node["amenity"="hospital"](around:12000,${lat},${lon});
  node["amenity"="school"](around:12000,${lat},${lon});
  node["amenity"="college"](around:12000,${lat},${lon});

  /* Railway Stations */
  node["railway"="station"]["station"!="subway"](around:12000,${lat},${lon});

  /* Metro Stations */
  (
    node["railway"="station"]["station"="subway"](around:12000,${lat},${lon});
    node["railway"="subway_entrance"](around:12000,${lat},${lon});
    node["public_transport"="station"]["subway"="yes"](around:12000,${lat},${lon});
  );
);
out tags;
`;

        const infraData = await fetchOverpass(infraQuery);

        const infra = {
            hospitals: new Set(),
            schools: new Set(),
            colleges: new Set(),
            railwayStations: new Set(),
            metroStations: new Set()
        };

        infraData.elements.forEach(el => {
            const t = el.tags || {};
            if (!t.name) return;

            if (t.amenity === "hospital") infra.hospitals.add(t.name);
            if (t.amenity === "school") infra.schools.add(t.name);
            if (t.amenity === "college") infra.colleges.add(t.name);

            // 🚆 Railway
            if (t.railway === "station" && t.station !== "subway") {
                infra.railwayStations.add(t.name);
            }

            // 🚇 Metro
            if (
                t.station === "subway" ||
                t.railway === "subway_entrance" ||
                (t.public_transport === "station" && t.subway === "yes")
            ) {
                infra.metroStations.add(t.name);
            }
        });
        const infrastructure = {
            hospitals: infra.hospitals.size,
            schools: infra.schools.size,
            colleges: infra.colleges.size,
            railwayStations: infra.railwayStations.size,
            metroStations: infra.metroStations.size,
            names: {
                hospitals: [...infra.hospitals],
                schools: [...infra.schools],
                colleges: [...infra.colleges],
                railwayStations: [...infra.railwayStations],
                metroStations: [...infra.metroStations]
            }
        };

        console.log(`Infrastructure data fetched`, infrastructure);
        /* -----------------------------
           5. WATER BODIES
        ----------------------------- */
        const waterQuery = `
[out:json][timeout:25];
(
  way["waterway"](around:12000,${lat},${lon});
  way["natural"="water"](around:12000,${lat},${lon});
);
out tags;
`;

        const waterData = await fetchOverpass(waterQuery);

        const rivers = new Set();
        const others = new Set();

        waterData.elements.forEach(el => {
            const t = el.tags || {};
            if (!t.name) return;
            if (t.waterway === "river") rivers.add(t.name);
            else others.add(t.name);
        });

        const waterBodies = {
            rivers: { count: rivers.size, names: [...rivers] },
            otherWaterBodies: { count: others.size, names: [...others] }
        };
        console.log(`Water Bodies data fetched`, waterBodies);
        /* -----------------------------
           6. WIKIPEDIA
        ----------------------------- */
        const wikiURL = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
            cityName
        )}`;
        const wikipedia = await safeFetch(wikiURL);
        console.log(`Wikipedia data fetched`, wikipedia);
        /* -----------------------------
           FINAL RESPONSE
        ----------------------------- */
        res.json({
            city: {
                name: cityName,
                displayName: city.display_name,
                lat,
                lon
            },
            population: locationStats.population,
            area: locationStats.area,
            weather,
            airQuality: airQualityString,
            infrastructure,
            waterBodies,
            wikipedia
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});
// =======================
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
