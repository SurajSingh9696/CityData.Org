import React, { useState, useEffect, useRef } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Fix for Leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// City background images mapping
const CITY_IMAGES = {
  'Delhi': 'https://images.unsplash.com/photo-1587474260584-136574528ed5?q=80&w=2070&auto=format&fit=crop',
  'Mumbai': 'https://images.unsplash.com/photo-1570168007204-dfb528c6248c?q=80&w=2070&auto=format&fit=crop',
  'Bangalore': 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?q=80&w=2070&auto=format&fit=crop',
  'Kolkata': 'https://images.unsplash.com/photo-1587471388266-746b8d6c9c3b?q=80&w=2070&auto=format&fit=crop',
  'Chennai': 'https://images.unsplash.com/photo-1595423121380-b3b4d8c116b6?q=80&w=2070&auto=format&fit=crop',
  'Hyderabad': 'https://images.unsplash.com/photo-1594736797933-d0c6e4d6d6c0?q=80&w=2070&auto=format&fit=crop',
  'Pune': 'https://images.unsplash.com/photo-1594736797933-d0c6e4d6d6c0?q=80&w=2070&auto=format&fit=crop',
  'Jaipur': 'https://images.unsplash.com/photo-1595423121380-b3b8c116b6?q=80&w=2070&auto=format&fit=crop',
  'default': 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=2070&auto=format&fit=crop'
};

const CityDataDashboard = () => {
  const [cityData, setCityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchCity, setSearchCity] = useState('Delhi');
  const [inputCity, setInputCity] = useState('Delhi');
  const [darkMode, setDarkMode] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  
  const reportRef = useRef(null);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Download PDF Report - FIXED VERSION
  const downloadPDFReport = async () => {
    if (!cityData || generatingPDF) return;
    
    setGeneratingPDF(true);
    
    try {
      // Create a temporary element for PDF generation
      const tempElement = document.createElement('div');
      tempElement.style.position = 'absolute';
      tempElement.style.left = '-9999px';
      tempElement.style.top = '0';
      tempElement.style.width = '800px';
      tempElement.style.backgroundColor = '#ffffff';
      tempElement.style.padding = '20px';
      tempElement.style.boxSizing = 'border-box';
      
      // Build PDF content
      tempElement.innerHTML = `
        <div id="pdf-content" style="font-family: Arial, sans-serif; color: #000000;">
          <!-- PDF Header -->
          <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3b82f6; padding-bottom: 20px;">
            <h1 style="color: #1e40af; font-size: 28px; margin-bottom: 5px;">CityData.Org</h1>
            <h2 style="color: #374151; font-size: 22px; margin-bottom: 10px;">${cityData.city.name} City Report</h2>
            <p style="color: #6b7280; font-size: 14px;">Generated on ${new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>

          <!-- City Overview -->
          <div style="margin-bottom: 25px;">
            <h3 style="color: #1f2937; font-size: 20px; margin-bottom: 15px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">City Overview</h3>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
              <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px;">
                <p style="color: #6b7280; font-size: 12px; margin-bottom: 5px;">City Name</p>
                <p style="color: #111827; font-size: 18px; font-weight: bold;">${cityData.city.name}</p>
              </div>
              <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px;">
                <p style="color: #6b7280; font-size: 12px; margin-bottom: 5px;">Location</p>
                <p style="color: #111827; font-size: 18px; font-weight: bold;">${cityData.city.displayName}</p>
              </div>
              <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px;">
                <p style="color: #6b7280; font-size: 12px; margin-bottom: 5px;">Population</p>
                <p style="color: #111827; font-size: 18px; font-weight: bold;">${(cityData.population / 1000000).toFixed(1)} Million</p>
              </div>
              <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px;">
                <p style="color: #6b7280; font-size: 12px; margin-bottom: 5px;">Area</p>
                <p style="color: #111827; font-size: 18px; font-weight: bold;">${cityData.area} km²</p>
              </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
              <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px;">
                <p style="color: #6b7280; font-size: 12px; margin-bottom: 5px;">Coordinates</p>
                <p style="color: #111827; font-size: 16px; font-weight: bold;">${cityData.city.lat.toFixed(4)}° N, ${cityData.city.lon.toFixed(4)}° E</p>
              </div>
              <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px;">
                <p style="color: #6b7280; font-size: 12px; margin-bottom: 5px;">Elevation</p>
                <p style="color: #111827; font-size: 16px; font-weight: bold;">214m above sea level</p>
              </div>
            </div>
          </div>

          <!-- Weather Information -->
          <div style="margin-bottom: 25px;">
            <h3 style="color: #1f2937; font-size: 20px; margin-bottom: 15px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Weather Information</h3>
            <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); border-radius: 10px; padding: 20px; color: white;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <div>
                  <p style="color: rgba(255, 255, 255, 0.9); font-size: 14px; margin-bottom: 5px;">Current Weather</p>
                  <p style="font-size: 36px; font-weight: bold; margin-bottom: 5px;">${cityData.weather.current_weather.temperature}°C</p>
                  <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px;">Clear Sky</p>
                </div>
                <div style="text-align: right;">
                  <p style="color: rgba(255, 255, 255, 0.9); font-size: 14px; margin-bottom: 5px;">Wind Details</p>
                  <p style="font-size: 18px; font-weight: bold;">${cityData.weather.current_weather.windspeed} km/h</p>
                  <p style="color: rgba(255, 255, 255, 0.9); font-size: 14px;">Direction: ${cityData.weather.current_weather.winddirection}°</p>
                </div>
              </div>
              
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 20px;">
                <div style="background: rgba(255, 255, 255, 0.15); border-radius: 8px; padding: 12px;">
                  <p style="color: rgba(255, 255, 255, 0.9); font-size: 12px; margin-bottom: 5px;">7-Day Forecast</p>
                  <p style="font-size: 16px; font-weight: bold;">Max: ${Math.max(...cityData.weather.daily.temperature_2m_max).toFixed(1)}°C</p>
                  <p style="font-size: 14px;">Min: ${Math.min(...cityData.weather.daily.temperature_2m_min).toFixed(1)}°C</p>
                </div>
                <div style="background: rgba(255, 255, 255, 0.15); border-radius: 8px; padding: 12px;">
                  <p style="color: rgba(255, 255, 255, 0.9); font-size: 12px; margin-bottom: 5px;">Temperature Range</p>
                  <p style="font-size: 16px; font-weight: bold;">Daily Avg: ${((cityData.weather.daily.temperature_2m_max.reduce((a,b) => a+b, 0) / cityData.weather.daily.temperature_2m_max.length) + (cityData.weather.daily.temperature_2m_min.reduce((a,b) => a+b, 0) / cityData.weather.daily.temperature_2m_min.length)) / 2}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Air Quality Index -->
          <div style="margin-bottom: 25px;">
            <h3 style="color: #1f2937; font-size: 20px; margin-bottom: 15px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Air Quality Index</h3>
            
            <div style="display: flex; gap: 20px; margin-bottom: 20px; align-items: center;">
              <div style="flex: 1; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px; text-align: center;">
                <p style="color: #6b7280; font-size: 14px; margin-bottom: 10px;">Current AQI</p>
                <p style="font-size: 48px; font-weight: bold; color: ${
                  cityData.airQuality.currentAQI.aqi <= 50 ? '#22c55e' : 
                  cityData.airQuality.currentAQI.aqi <= 100 ? '#eab308' : 
                  cityData.airQuality.currentAQI.aqi <= 150 ? '#f97316' : 
                  cityData.airQuality.currentAQI.aqi <= 200 ? '#ef4444' : '#a855f7'
                };">${cityData.airQuality.currentAQI.aqi}</p>
                <p style="font-size: 18px; font-weight: bold; color: ${
                  cityData.airQuality.currentAQI.aqi <= 50 ? '#22c55e' : 
                  cityData.airQuality.currentAQI.aqi <= 100 ? '#eab308' : 
                  cityData.airQuality.currentAQI.aqi <= 150 ? '#f97316' : 
                  cityData.airQuality.currentAQI.aqi <= 200 ? '#ef4444' : '#a855f7'
                };">${cityData.airQuality.currentAQI.category}</p>
              </div>
              
              <div style="flex: 1; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px;">
                <p style="color: #1f2937; font-size: 16px; font-weight: bold; margin-bottom: 15px;">Key Details</p>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  <div>
                    <p style="color: #6b7280; font-size: 12px;">Dominant Pollutant</p>
                    <p style="color: #111827; font-size: 16px; font-weight: bold;">${cityData.airQuality.currentAQI.dominentPollutant}</p>
                  </div>
                  <div>
                    <p style="color: #6b7280; font-size: 12px;">Last Updated</p>
                    <p style="color: #111827; font-size: 14px;">${new Date(cityData.airQuality.currentAQI.time).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Pollutant Concentrations -->
            <div style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px;">
              <p style="color: #1f2937; font-size: 18px; font-weight: bold; margin-bottom: 15px;">Pollutant Concentrations (µg/m³)</p>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #f9fafb; border-bottom: 2px solid #e5e7eb;">
                    <th style="text-align: left; padding: 12px; font-weight: bold; color: #374151;">Pollutant</th>
                    <th style="text-align: left; padding: 12px; font-weight: bold; color: #374151;">Concentration</th>
                    <th style="text-align: left; padding: 12px; font-weight: bold; color: #374151;">Level</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.entries(cityData.airQuality.currentAQI.pollutants).map(([pollutant, value]) => `
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                      <td style="padding: 12px; font-weight: bold; color: #111827;">${pollutant.toUpperCase()}</td>
                      <td style="padding: 12px; color: #111827;">${value} µg/m³</td>
                      <td style="padding: 12px;">
                        <span style="
                          display: inline-block; 
                          padding: 4px 12px; 
                          border-radius: 20px; 
                          font-size: 12px; 
                          font-weight: bold;
                          background-color: ${
                            pollutant === 'pm25' || pollutant === 'pm10' 
                              ? (value <= 50 ? '#dcfce7' : value <= 100 ? '#fef3c7' : value <= 150 ? '#ffedd5' : value <= 200 ? '#fee2e2' : '#f3e8ff')
                              : (value <= 20 ? '#dcfce7' : value <= 40 ? '#fef3c7' : value <= 60 ? '#ffedd5' : value <= 80 ? '#fee2e2' : '#f3e8ff')
                          };
                          color: ${
                            pollutant === 'pm25' || pollutant === 'pm10'
                              ? (value <= 50 ? '#166534' : value <= 100 ? '#854d0e' : value <= 150 ? '#9a3412' : value <= 200 ? '#991b1b' : '#7c3aed')
                              : (value <= 20 ? '#166534' : value <= 40 ? '#854d0e' : value <= 60 ? '#9a3412' : value <= 80 ? '#991b1b' : '#7c3aed')
                          };
                        ">
                          ${
                            pollutant === 'pm25' || pollutant === 'pm10'
                              ? (value <= 50 ? 'Good' : value <= 100 ? 'Moderate' : value <= 150 ? 'Unhealthy' : value <= 200 ? 'Very Unhealthy' : 'Hazardous')
                              : (value <= 20 ? 'Good' : value <= 40 ? 'Moderate' : value <= 60 ? 'Unhealthy' : value <= 80 ? 'Very Unhealthy' : 'Hazardous')
                          }
                        </span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Infrastructure -->
          <div style="margin-bottom: 25px;">
            <h3 style="color: #1f2937; font-size: 20px; margin-bottom: 15px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Infrastructure & Amenities</h3>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;">
              <div style="border: 1px solid #fee2e2; border-radius: 10px; padding: 20px; text-align: center; background-color: #fef2f2;">
                <p style="color: #dc2626; font-size: 32px; font-weight: bold; margin-bottom: 5px;">${cityData.infrastructure.hospitals}</p>
                <p style="color: #374151; font-size: 14px; font-weight: bold;">Hospitals</p>
              </div>
              <div style="border: 1px solid #fef3c7; border-radius: 10px; padding: 20px; text-align: center; background-color: #fffbeb;">
                <p style="color: #d97706; font-size: 32px; font-weight: bold; margin-bottom: 5px;">${cityData.infrastructure.schools}</p>
                <p style="color: #374151; font-size: 14px; font-weight: bold;">Schools</p>
              </div>
              <div style="border: 1px solid #dbeafe; border-radius: 10px; padding: 20px; text-align: center; background-color: #eff6ff;">
                <p style="color: #2563eb; font-size: 32px; font-weight: bold; margin-bottom: 5px;">${cityData.infrastructure.railwayStations}</p>
                <p style="color: #374151; font-size: 14px; font-weight: bold;">Railway Stations</p>
              </div>
              <div style="border: 1px solid #e9d5ff; border-radius: 10px; padding: 20px; text-align: center; background-color: #faf5ff;">
                <p style="color: #7c3aed; font-size: 32px; font-weight: bold; margin-bottom: 5px;">${cityData.infrastructure.metroStations}</p>
                <p style="color: #374151; font-size: 14px; font-weight: bold;">Metro Stations</p>
              </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 20px;">
              <div style="border: 1px solid #d1fae5; border-radius: 10px; padding: 20px; text-align: center; background-color: #f0fdf4;">
                <p style="color: #059669; font-size: 32px; font-weight: bold; margin-bottom: 5px;">${cityData.infrastructure.colleges}</p>
                <p style="color: #374151; font-size: 14px; font-weight: bold;">Colleges</p>
              </div>
              <div style="border: 1px solid #f3e8ff; border-radius: 10px; padding: 20px; text-align: center; background-color: #faf5ff;">
                <p style="color: #a855f7; font-size: 24px; font-weight: bold; margin-bottom: 5px;">Major Facilities</p>
                <p style="color: #374151; font-size: 12px;">${cityData.infrastructure.names.hospitals.slice(0, 3).join(', ')}</p>
              </div>
            </div>
          </div>

          <!-- About Section -->
          <div style="margin-bottom: 30px;">
            <h3 style="color: #1f2937; font-size: 20px; margin-bottom: 15px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">About ${cityData.city.name}</h3>
            <div style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px; background-color: #f9fafb;">
              <p style="color: #374151; font-size: 14px; line-height: 1.6; margin-bottom: 15px;">
                ${cityData.wikipedia.extract}
              </p>
              <div style="display: flex; justify-content: space-between; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                <div>
                  <p style="color: #6b7280; font-size: 12px; margin-bottom: 5px;">Timezone</p>
                  <p style="color: #111827; font-size: 14px; font-weight: bold;">IST (UTC+5:30)</p>
                </div>
                <div>
                  <p style="color: #6b7280; font-size: 12px; margin-bottom: 5px;">Report Generated</p>
                  <p style="color: #111827; font-size: 14px;">${new Date().toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- PDF Footer -->
          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; font-size: 12px;">
            <p style="margin-bottom: 5px;">Report generated by CityData.Org - Comprehensive City Intelligence Platform</p>
            <p style="margin-bottom: 5px;">Data sources: OpenWeatherMap, OpenAQ, Census India, OpenStreetMap</p>
            <p>For more information visit: https://citydata.org</p>
          </div>
        </div>
      `;
      
      // Add to document
      document.body.appendChild(tempElement);
      
      // Wait for element to be rendered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Generate PDF
      const canvas = await html2canvas(tempElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        removeContainer: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate image dimensions
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;
      
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      
      // Save PDF
      pdf.save(`${cityData.city.name}_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      
      // Clean up
      document.body.removeChild(tempElement);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Fetch city data from API
  const fetchCityData = async (city) => {
    setLoading(true);
    setError(null);
    
    try {
      // Use your actual API endpoint
      const response = await axios.get(`https://citydata-org-backend.onrender.com/api?city=${city}`);
      
      if (response.data) {
        setCityData(response.data);
      } else {
        throw new Error('No data received');
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch city data. Using sample data instead.');
      
      // Fallback to sample data if API fails
      const sampleData = {
        city: {
          name: city,
          displayName: `${city}, India`,
          lat: 28.6139,
          lon: 77.2090
        },
        population: 16769200,
        area: 1484,
        weather: {
          current_weather: {
            temperature: 19.5,
            windspeed: 8.2,
            winddirection: 293,
            is_day: 1,
            weathercode: 0
          },
          daily: {
            time: [
              "2025-12-24",
              "2025-12-25",
              "2025-12-26",
              "2025-12-27",
              "2025-12-28",
              "2025-12-29",
              "2025-12-30"
            ],
            temperature_2m_max: [19.8, 19.9, 18.7, 19.8, 20.4, 20.6, 20.9],
            temperature_2m_min: [12, 9.7, 11.8, 10.3, 11.9, 9.9, 11.2]
          }
        },
        airQuality: {
          currentAQI: {
            aqi: 229,
            category: "Very Unhealthy",
            pollutants: {
              pm25: 229,
              pm10: 199,
              no2: 26.7,
              so2: 28.8,
              o3: 45.2,
              co: 15.2
            },
            dominentPollutant: "pm25",
            time: "2025-12-24 15:00:00"
          },
          history: Array.from({length: 15}, (_, i) => ({
            timestamp: `2025-12-24T${String(i).padStart(2, '0')}:00`,
            pm25: Math.floor(Math.random() * 200) + 20
          }))
        },
        infrastructure: {
          hospitals: Math.floor(Math.random() * 100) + 200,
          schools: Math.floor(Math.random() * 100) + 100,
          colleges: Math.floor(Math.random() * 20) + 10,
          railwayStations: Math.floor(Math.random() * 20) + 20,
          metroStations: Math.floor(Math.random() * 200) + 200,
          names: {
            hospitals: [
              "City General Hospital",
              "Metro Medical Center",
              "Public Health Institute",
              "Specialty Care Hospital"
            ],
            metroStations: [
              "City Center",
              "Main Junction",
              "Downtown",
              "Central Station"
            ]
          }
        },
        wikipedia: {
          extract: `${city} is a major city in India with rich cultural heritage and modern infrastructure.`,
          thumbnail: {
            source: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Jama_Masjid_2011.jpg/320px-Jama_Masjid_2011.jpg"
          }
        }
      };
      
      setCityData(sampleData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCityData(searchCity);
  }, [searchCity]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchCity(inputCity.trim());
  };

  const getWeatherIcon = (weathercode, isDay) => {
    if (weathercode === 0) return isDay ? 'fa-sun' : 'fa-moon';
    if (weathercode === 1 || weathercode === 2 || weathercode === 3) return 'fa-cloud';
    if (weathercode >= 45 && weathercode <= 48) return 'fa-smog';
    if (weathercode >= 51 && weathercode <= 67) return 'fa-cloud-rain';
    if (weathercode >= 71 && weathercode <= 77) return 'fa-snowflake';
    if (weathercode >= 80 && weathercode <= 82) return 'fa-cloud-showers-heavy';
    if (weathercode >= 95 && weathercode <= 99) return 'fa-bolt';
    return 'fa-cloud';
  };

  const getAQIColor = (aqi) => {
    if (aqi <= 50) return 'text-green-500';
    if (aqi <= 100) return 'text-yellow-500';
    if (aqi <= 150) return 'text-orange-500';
    if (aqi <= 200) return 'text-red-500';
    if (aqi <= 300) return 'text-purple-500';
    return 'text-maroon-500';
  };

  const getAQIBackground = (aqi) => {
    if (aqi <= 50) return 'bg-green-100';
    if (aqi <= 100) return 'bg-yellow-100';
    if (aqi <= 150) return 'bg-orange-100';
    if (aqi <= 200) return 'bg-red-100';
    if (aqi <= 300) return 'bg-purple-100';
    return 'bg-maroon-100';
  };

  const getAQIBorderColor = (aqi) => {
    if (aqi <= 50) return 'border-green-500';
    if (aqi <= 100) return 'border-yellow-500';
    if (aqi <= 150) return 'border-orange-500';
    if (aqi <= 200) return 'border-red-500';
    if (aqi <= 300) return 'border-purple-500';
    return 'border-maroon-500';
  };


  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-slate-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className={`mt-4 ${darkMode ? 'text-gray-300' : 'text-slate-600'}`}>Loading {searchCity} data...</p>
        </div>
      </div>
    );
  }

  if (!cityData) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-slate-50'}`}>
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Failed to load data</h2>
          <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-slate-600'}`}>{error || 'No data available'}</p>
          <button 
            onClick={() => fetchCityData(searchCity)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Weather Chart Data
  const weatherChartData = {
    labels: cityData.weather.daily.time.map(date => 
      new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    ),
    datasets: [
      {
        label: 'Max Temp (°C)',
        data: cityData.weather.daily.temperature_2m_max,
        borderColor: '#f97316',
        backgroundColor: darkMode ? 'rgba(249, 115, 22, 0.2)' : 'rgba(249, 115, 22, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Min Temp (°C)',
        data: cityData.weather.daily.temperature_2m_min,
        borderColor: '#3b82f6',
        backgroundColor: 'transparent',
        tension: 0.4,
        borderDash: [5, 5]
      }
    ]
  };

  const weatherChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: 'top',
        labels: {
          color: darkMode ? '#d1d5db' : '#374151'
        }
      }
    },
    scales: {
      y: { 
        beginAtZero: false, 
        grid: { 
          color: darkMode ? '#374151' : '#f1f5f9' 
        },
        ticks: {
          color: darkMode ? '#d1d5db' : '#374151'
        }
      },
      x: { 
        grid: { 
          display: false 
        },
        ticks: {
          color: darkMode ? '#d1d5db' : '#374151'
        }
      }
    }
  };

  // AQI Chart Data - FIXED: Added proper bar styling
  const aqiChartData = {
    labels: cityData.airQuality.history.slice(0, 6).map(item => 
      new Date(item.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    ),
    datasets: [{
      label: 'PM2.5 (µg/m³)',
      data: cityData.airQuality.history.slice(0, 6).map(item => item.pm25),
      backgroundColor: cityData.airQuality.history.slice(0, 6).map(item => {
        if (item.pm25 > 150) return '#ef4444';
        if (item.pm25 > 100) return '#f97316';
        if (item.pm25 > 50) return '#eab308';
        return '#22c55e';
      }),
      borderColor: cityData.airQuality.history.slice(0, 6).map(item => {
        if (item.pm25 > 150) return '#dc2626';
        if (item.pm25 > 100) return '#ea580c';
        if (item.pm25 > 50) return '#ca8a04';
        return '#16a34a';
      }),
      borderWidth: 2,
      borderRadius: 8,
      hoverBackgroundColor: cityData.airQuality.history.slice(0, 6).map(item => {
        if (item.pm25 > 150) return '#fca5a5';
        if (item.pm25 > 100) return '#fdba74';
        if (item.pm25 > 50) return '#fde047';
        return '#86efac';
      }),
      barPercentage: 0.6,
      categoryPercentage: 0.8
    }]
  };

  const aqiChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        display: true,
        position: 'top',
        labels: {
          color: darkMode ? '#d1d5db' : '#374151',
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      },
      tooltip: {
        backgroundColor: darkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)',
        titleColor: darkMode ? '#d1d5db' : '#1f2937',
        bodyColor: darkMode ? '#d1d5db' : '#1f2937',
        borderColor: darkMode ? '#4b5563' : '#d1d5db',
        borderWidth: 1,
        cornerRadius: 6
      }
    },
    scales: {
      y: { 
        beginAtZero: true, 
        grid: { 
          color: darkMode ? '#374151' : '#f1f5f9',
          drawBorder: false
        },
        ticks: {
          color: darkMode ? '#d1d5db' : '#374151',
          font: {
            size: 11
          }
        },
        title: {
          display: true,
          text: 'PM2.5 (µg/m³)',
          color: darkMode ? '#d1d5db' : '#374151',
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      },
      x: { 
        grid: { 
          display: false,
          drawBorder: false
        },
        ticks: {
          color: darkMode ? '#d1d5db' : '#374151',
          font: {
            size: 11
          }
        }
      }
    },
    animation: {
      duration: 1000,
      easing: 'easeOutQuart'
    }
  };

  // Get city background image
  const cityImage = CITY_IMAGES[cityData.city.name] || CITY_IMAGES.default;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-white' : 'bg-slate-50 text-slate-800'}`}>
      {/* Navigation - Not included in PDF */}
      <nav className={`fixed top-0 w-full z-50 backdrop-blur-md border-b transition-colors duration-300 ${
        darkMode ? 'bg-gray-900/80 border-gray-700' : 'bg-white/90 border-slate-200'
      } shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                darkMode ? 'bg-blue-500 text-white' : 'bg-blue-600 text-white'
              }`}>
                <i className="fas fa-city"></i>
              </div>
              <span className={`text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${
                darkMode ? 'from-blue-400 to-blue-600' : 'from-blue-600 to-blue-900'
              }`}>
                CityData.Org
              </span>
            </div>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className={`fas fa-magnifying-glass ${darkMode ? 'text-gray-400' : 'text-slate-400'}`}></i>
              </div>
              <input
                type="text"
                value={inputCity}
                onChange={(e) => setInputCity(e.target.value)}
                className={`block w-full pl-10 pr-10 py-2 border rounded-full leading-5 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm transition duration-150 ease-in-out ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:bg-gray-700' 
                    : 'bg-slate-50 border-slate-300 focus:bg-white'
                }`}
                placeholder="Search city (e.g. Mumbai, Bangalore)..."
              />
              <button 
                type="submit"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <i className="fas fa-location-crosshairs text-blue-500 hover:text-blue-600" title="Search"></i>
              </button>
            </form>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              <button 
                onClick={toggleDarkMode}
                className={`p-2 rounded-full transition-colors ${
                  darkMode ? 'text-yellow-300 hover:text-yellow-200' : 'text-slate-500 hover:text-blue-600'
                }`}
                title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                <i className={`fas ${darkMode ? 'fa-sun' : 'fa-moon'}`}></i>
              </button>
              <button 
                onClick={downloadPDFReport}
                disabled={generatingPDF}
                className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-full transition-colors text-sm font-medium shadow-md hover:shadow-lg ${
                  darkMode 
                    ? 'bg-blue-500 hover:bg-blue-600 text-white disabled:bg-blue-800' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-400'
                }`}
              >
                {generatingPDF ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <span>Download Report</span>
                    <i className="fas fa-download"></i>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-16">
        {/* Report Content for PDF - Hidden from main view */}
        <div ref={reportRef} className="hidden">
          <div className="p-8 bg-white">
            {/* PDF Header */}
            <div className="mb-8 text-center border-b pb-4">
              <h1 className="text-3xl font-bold text-blue-800">CityData.Org</h1>
              <h2 className="text-2xl font-semibold text-gray-700 mt-2">{cityData.city.name} City Report</h2>
              <p className="text-gray-600">Generated on {new Date().toLocaleDateString()}</p>
            </div>

            {/* City Overview */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4">City Overview</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-gray-500">City Name</p>
                  <p className="text-lg font-semibold">{cityData.city.name}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="text-lg font-semibold">{cityData.city.displayName}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-gray-500">Population</p>
                  <p className="text-lg font-semibold">{(cityData.population / 1000000).toFixed(1)} Million</p>
                </div>
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-gray-500">Area</p>
                  <p className="text-lg font-semibold">{cityData.area} km²</p>
                </div>
              </div>
            </div>

            {/* Weather Data */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Weather Information</h3>
              <div className="border rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="text-sm text-gray-500">Current Temperature</p>
                    <p className="text-3xl font-bold text-orange-600">{cityData.weather.current_weather.temperature}°C</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Wind Speed</p>
                    <p className="text-lg font-semibold">{cityData.weather.current_weather.windspeed} km/h</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Air Quality Data */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Air Quality Index</h3>
              <div className="border rounded-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <p className="text-sm text-gray-500">Current AQI</p>
                    <p className={`text-4xl font-bold ${getAQIColor(cityData.airQuality.currentAQI.aqi)}`}>
                      {cityData.airQuality.currentAQI.aqi}
                    </p>
                    <p className="text-lg font-semibold">{cityData.airQuality.currentAQI.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Dominant Pollutant</p>
                    <p className="text-lg font-semibold">{cityData.airQuality.currentAQI.dominentPollutant}</p>
                  </div>
                </div>
                
                {/* Pollutant Concentration Table */}
                <h4 className="text-lg font-semibold text-gray-700 mb-3">Pollutant Concentrations</h4>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border p-2 text-left">Pollutant</th>
                      <th className="border p-2 text-left">Concentration</th>
                      <th className="border p-2 text-left">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(cityData.airQuality.currentAQI.pollutants).map(([pollutant, value]) => (
                      <tr key={pollutant} className="border">
                        <td className="border p-2 font-medium">{pollutant.toUpperCase()}</td>
                        <td className="border p-2">{value}</td>
                        <td className="border p-2">µg/m³</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Infrastructure */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Infrastructure</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="border rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{cityData.infrastructure.hospitals}</p>
                  <p className="text-sm text-gray-600">Hospitals</p>
                </div>
                <div className="border rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-600">{cityData.infrastructure.schools}</p>
                  <p className="text-sm text-gray-600">Schools</p>
                </div>
                <div className="border rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{cityData.infrastructure.railwayStations}</p>
                  <p className="text-sm text-gray-600">Railway Stations</p>
                </div>
                <div className="border rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-purple-600">{cityData.infrastructure.metroStations}</p>
                  <p className="text-sm text-gray-600">Metro Stations</p>
                </div>
              </div>
            </div>

            {/* Footer for PDF */}
            <div className="mt-12 pt-4 border-t text-center text-gray-500 text-sm">
              <p>Report generated by CityData.Org - Comprehensive City Intelligence Platform</p>
              <p className="mt-1">Data as of {new Date(cityData.airQuality.currentAQI.time).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Main Dashboard - Visible on Website */}
        {/* Hero Section */}
        <header className="relative bg-slate-900 text-white overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img 
              src={cityImage} 
              alt={`${cityData.city.name} cityscape`}
              className="w-full h-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
            <div className="flex flex-col lg:flex-row justify-between items-end gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-semibold rounded-full uppercase tracking-wider">
                    Major City
                  </span>
                  <span className="px-3 py-1 bg-slate-700/50 border border-slate-600 text-slate-300 text-xs font-semibold rounded-full uppercase tracking-wider">
                    India
                  </span>
                </div>
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white">
                  {cityData.city.name}
                </h1>
                <div className="flex flex-wrap items-center gap-6 text-slate-300 text-sm md:text-base">
                  <div className="flex items-center gap-2">
                    <i className="fas fa-map-pin text-blue-400"></i>
                    <span>{cityData.city.displayName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <i className="fas fa-compass text-blue-400"></i>
                    <span>{cityData.city.lat.toFixed(2)}° N, {cityData.city.lon.toFixed(2)}° E</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <i className="fas fa-mountain text-blue-400"></i>
                    <span>214m Elevation</span>
                  </div>
                </div>
              </div>
              
              {/* Leaflet Map */}
              <div className="w-full lg:w-64 h-48 lg:h-32 rounded-xl overflow-hidden border border-slate-700 shadow-2xl relative">
                <MapContainer
                  center={[cityData.city.lat, cityData.city.lon]}
                  zoom={12}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={false}
                  className="z-10"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[cityData.city.lat, cityData.city.lon]}>
                    <Popup>
                      <b>{cityData.city.name}</b><br />
                      Latitude: {cityData.city.lat.toFixed(4)}<br />
                      Longitude: {cityData.city.lon.toFixed(4)}
                    </Popup>
                  </Marker>
                </MapContainer>
                <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-sm rounded-lg text-xs p-2 border border-white/20">
                  <i className="fas fa-map mr-1"></i>Interactive Map
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Quick Stats */}
        <section className="relative z-20 -mt-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Population */}
            <div className={`rounded-xl shadow-lg p-4 border-l-4 border-blue-500 transform hover:-translate-y-1 transition-transform duration-300 ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className={`text-xs font-medium uppercase ${
                    darkMode ? 'text-gray-400' : 'text-slate-500'
                  }`}>Population</p>
                  <h3 className={`text-xl md:text-2xl font-bold mt-1 ${
                    darkMode ? 'text-white' : 'text-slate-800'
                  }`}>
                    {(cityData.population / 1000000).toFixed(1)}M
                  </h3>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'
                }`}>
                  <i className="fas fa-users"></i>
                </div>
              </div>
              <p className={`text-xs mt-2 ${
                darkMode ? 'text-gray-500' : 'text-slate-400'
              }`}>Census 2011</p>
            </div>

            {/* Area */}
            <div className={`rounded-xl shadow-lg p-4 border-l-4 border-green-500 transform hover:-translate-y-1 transition-transform duration-300 ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className={`text-xs font-medium uppercase ${
                    darkMode ? 'text-gray-400' : 'text-slate-500'
                  }`}>Area</p>
                  <h3 className={`text-xl md:text-2xl font-bold mt-1 ${
                    darkMode ? 'text-white' : 'text-slate-800'
                  }`}>
                    {cityData.area.toLocaleString()} km²
                  </h3>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600'
                }`}>
                  <i className="fas fa-map"></i>
                </div>
              </div>
              <p className={`text-xs mt-2 ${
                darkMode ? 'text-gray-500' : 'text-slate-400'
              }`}>Total Area</p>
            </div>

            {/* AQI */}
            <div className={`rounded-xl shadow-lg p-4 border-l-4 ${getAQIBorderColor(cityData.airQuality.currentAQI.aqi)} transform hover:-translate-y-1 transition-transform duration-300 ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className={`text-xs font-medium uppercase ${
                    darkMode ? 'text-gray-400' : 'text-slate-500'
                  }`}>Air Quality</p>
                  <h3 className={`text-xl md:text-2xl font-bold mt-1 ${getAQIColor(cityData.airQuality.currentAQI.aqi)}`}>
                    {cityData.airQuality.currentAQI.aqi}
                  </h3>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  darkMode ? `${getAQIBackground(cityData.airQuality.currentAQI.aqi).replace('bg-', 'bg-')}/20` : getAQIBackground(cityData.airQuality.currentAQI.aqi)
                } ${getAQIColor(cityData.airQuality.currentAQI.aqi)}`}>
                  <i className="fas fa-mask-face"></i>
                </div>
              </div>
              <span className={`inline-block mt-2 px-2 py-0.5 text-xs rounded-full font-medium ${
                darkMode 
                  ? `${getAQIBackground(cityData.airQuality.currentAQI.aqi).replace('bg-', 'bg-')}/20 ${getAQIColor(cityData.airQuality.currentAQI.aqi)}`
                  : `${getAQIBackground(cityData.airQuality.currentAQI.aqi)} ${getAQIColor(cityData.airQuality.currentAQI.aqi).replace('text-', 'text-')}`
              }`}>
                {cityData.airQuality.currentAQI.category}
              </span>
            </div>

            {/* Temperature */}
            <div className={`rounded-xl shadow-lg p-4 border-l-4 border-orange-500 transform hover:-translate-y-1 transition-transform duration-300 ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className={`text-xs font-medium uppercase ${
                    darkMode ? 'text-gray-400' : 'text-slate-500'
                  }`}>Temperature</p>
                  <h3 className={`text-xl md:text-2xl font-bold mt-1 ${
                    darkMode ? 'text-white' : 'text-slate-800'
                  }`}>
                    {cityData.weather.current_weather.temperature}°C
                  </h3>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-50 text-orange-500'
                }`}>
                  <i className={`fas ${getWeatherIcon(cityData.weather.current_weather.weathercode, cityData.weather.current_weather.is_day)}`}></i>
                </div>
              </div>
              <p className={`text-xs mt-2 ${
                darkMode ? 'text-gray-500' : 'text-slate-400'
              }`}>Wind: {cityData.weather.current_weather.windspeed} km/h</p>
            </div>

            {/* Hospitals */}
            <div className={`hidden lg:block rounded-xl shadow-lg p-4 border-l-4 border-red-500 transform hover:-translate-y-1 transition-transform duration-300 ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className={`text-xs font-medium uppercase ${
                    darkMode ? 'text-gray-400' : 'text-slate-500'
                  }`}>Hospitals</p>
                  <h3 className={`text-xl md:text-2xl font-bold mt-1 ${
                    darkMode ? 'text-white' : 'text-slate-800'
                  }`}>
                    {cityData.infrastructure.hospitals}
                  </h3>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'
                }`}>
                  <i className="fas fa-hospital"></i>
                </div>
              </div>
              <p className={`text-xs mt-2 ${
                darkMode ? 'text-gray-500' : 'text-slate-400'
              }`}>Registered Facilities</p>
            </div>
          </div>
        </section>

        {/* Main Dashboard Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 sm:space-y-12">
          {/* Weather Section */}
          <section id="weather">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <h2 className={`text-2xl font-bold flex items-center gap-2 ${
                darkMode ? 'text-white' : 'text-slate-800'
              }`}>
                <i className="fas fa-cloud-sun text-blue-500"></i> Weather Forecast
              </h2>
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                Source: OpenWeatherMap
              </span>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Current Weather Card */}
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-blue-100 font-medium">Now</p>
                    <h3 className="text-4xl sm:text-5xl font-bold mt-2">
                      {cityData.weather.current_weather.temperature}°C
                    </h3>
                    <p className="text-blue-100 mt-1 capitalize">
                      {cityData.weather.current_weather.weathercode === 0 ? 'Clear Sky' : 'Partly Cloudy'}
                    </p>
                  </div>
                  <i className={`fas ${getWeatherIcon(cityData.weather.current_weather.weathercode, cityData.weather.current_weather.is_day)} text-5xl sm:text-6xl text-yellow-300 animate-pulse`}></i>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-6 sm:mt-8">
                  <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-blue-100 text-xs mb-1">
                      <i className="fas fa-wind"></i> Wind
                    </div>
                    <p className="font-semibold">{cityData.weather.current_weather.windspeed} km/h</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-blue-100 text-xs mb-1">
                      <i className="fas fa-compass"></i> Direction
                    </div>
                    <p className="font-semibold">{cityData.weather.current_weather.winddirection}°</p>
                  </div>
                </div>
              </div>

              {/* 7-Day Forecast Chart */}
              <div className={`lg:col-span-2 rounded-2xl p-4 sm:p-6 shadow-sm border ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 ${
                  darkMode ? 'text-white' : 'text-slate-800'
                }`}>7-Day Temperature Trend</h3>
                <div className="h-64 w-full">
                  <Line data={weatherChartData} options={weatherChartOptions} />
                </div>
              </div>
            </div>
          </section>

          {/* Pollution Section - FIXED AQI Styling */}
          <section id="pollution">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <h2 className={`text-2xl font-bold flex items-center gap-2 ${
                darkMode ? 'text-white' : 'text-slate-800'
              }`}>
                <i className="fas fa-smog text-purple-600"></i> Air Quality Index (AQI)
              </h2>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                darkMode 
                  ? `${getAQIBackground(cityData.airQuality.currentAQI.aqi).replace('bg-', 'bg-')}/20 ${getAQIColor(cityData.airQuality.currentAQI.aqi)}`
                  : `${getAQIBackground(cityData.airQuality.currentAQI.aqi)} ${getAQIColor(cityData.airQuality.currentAQI.aqi)}`
              }`}>
                {cityData.airQuality.currentAQI.category}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main AQI Gauge - IMPROVED STYLING */}
              <div className={`rounded-2xl p-6 shadow-sm border flex flex-col items-center justify-center text-center ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'
              }`}>
                <div className="relative w-48 h-48 flex items-center justify-center mb-4">
                  {/* AQI Gauge */}
                  <div className="absolute inset-0 rounded-full" style={{
                    background: `conic-gradient(
                      #22c55e 0% 10%,
                      #eab308 10% 20%,
                      #f97316 20% 40%,
                      #ef4444 40% 80%,
                      #a855f7 80% 92%,
                      ${darkMode ? '#374151' : '#f3f4f6'} 92% 100%
                    )`,
                    transform: 'rotate(-126deg)'
                  }}></div>
                  <div className="absolute inset-4 rounded-full flex flex-col items-center justify-center" style={{
                    background: darkMode ? 'radial-gradient(circle, #1f2937, #111827)' : 'radial-gradient(circle, #ffffff, #f8fafc)'
                  }}>
                    <span className={`text-5xl font-black ${getAQIColor(cityData.airQuality.currentAQI.aqi)}`}>
                      {cityData.airQuality.currentAQI.aqi}
                    </span>
                    <span className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                      US AQI
                    </span>
                  </div>
                </div>
                <h3 className={`text-2xl font-bold mb-2 ${getAQIColor(cityData.airQuality.currentAQI.aqi)}`}>
                  {cityData.airQuality.currentAQI.category}
                </h3>
                <p className={`text-sm mb-4 px-4 ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                  Health warnings of emergency conditions. The entire population is more likely to be affected.
                </p>
                
                <div className="w-full mt-4 grid grid-cols-2 gap-2">
                  <div className={`p-2 rounded text-center ${darkMode ? 'bg-gray-700' : 'bg-slate-50'}`}>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-slate-400'}`}>Dominant</p>
                    <p className={`font-bold ${darkMode ? 'text-white' : 'text-slate-700'}`}>
                      {cityData.airQuality.currentAQI.dominentPollutant}
                    </p>
                  </div>
                  <div className={`p-2 rounded text-center ${darkMode ? 'bg-gray-700' : 'bg-slate-50'}`}>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-slate-400'}`}>Source</p>
                    <p className={`font-bold ${darkMode ? 'text-white' : 'text-slate-700'}`}>CPCB</p>
                  </div>
                </div>
              </div>

              {/* Pollutants Breakdown - FIXED VISIBLE BARS */}
              <div className={`rounded-2xl p-6 shadow-sm border ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'
              }`}>
                <h3 className={`text-lg font-semibold mb-6 ${
                  darkMode ? 'text-white' : 'text-slate-800'
                }`}>Pollutant Concentration</h3>
                <div className="space-y-6">
                  {/* PM2.5 */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                        PM2.5
                      </span>
                      <span className={`font-bold ${getAQIColor(cityData.airQuality.currentAQI.pollutants.pm25 * 2)}`}>
                        {cityData.airQuality.currentAQI.pollutants.pm25} µg/m³
                      </span>
                    </div>
                    <div className={`w-full h-3 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-slate-100'}`}>
                      <div 
                        className="h-3 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
                        style={{ width: `${Math.min((cityData.airQuality.currentAQI.pollutants.pm25 / 250) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* PM10 */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                        PM10
                      </span>
                      <span className={`font-bold ${getAQIColor(cityData.airQuality.currentAQI.pollutants.pm10 * 2)}`}>
                        {cityData.airQuality.currentAQI.pollutants.pm10} µg/m³
                      </span>
                    </div>
                    <div className={`w-full h-3 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-slate-100'}`}>
                      <div 
                        className="h-3 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
                        style={{ width: `${Math.min((cityData.airQuality.currentAQI.pollutants.pm10 / 350) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* NO2 */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                        NO₂
                      </span>
                      <span className={`font-bold ${getAQIColor(cityData.airQuality.currentAQI.pollutants.no2 * 4)}`}>
                        {cityData.airQuality.currentAQI.pollutants.no2} µg/m³
                      </span>
                    </div>
                    <div className={`w-full h-3 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-slate-100'}`}>
                      <div 
                        className="h-3 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
                        style={{ width: `${Math.min((cityData.airQuality.currentAQI.pollutants.no2 / 80) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* SO2 */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                        SO₂
                      </span>
                      <span className={`font-bold ${getAQIColor(cityData.airQuality.currentAQI.pollutants.so2 * 4)}`}>
                        {cityData.airQuality.currentAQI.pollutants.so2} µg/m³
                      </span>
                    </div>
                    <div className={`w-full h-3 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-slate-100'}`}>
                      <div 
                        className="h-3 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
                        style={{ width: `${Math.min((cityData.airQuality.currentAQI.pollutants.so2 / 80) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 24h Trend Chart - IMPROVED VISIBILITY */}
              <div className={`rounded-2xl p-4 sm:p-6 shadow-sm border ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 ${
                  darkMode ? 'text-white' : 'text-slate-800'
                }`}>24h PM2.5 Trend</h3>
                <div className="h-48 w-full">
                  <Bar data={aqiChartData} options={aqiChartOptions} />
                </div>
                <div className={`mt-4 text-xs ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span>Good (0-50)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span>Moderate (51-100)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span>Unhealthy (101+)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Infrastructure Section */}
          <section id="infrastructure">
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-2xl font-bold flex items-center gap-2 ${
                darkMode ? 'text-white' : 'text-slate-800'
              }`}>
                <i className="fas fa-building-columns text-indigo-600"></i> Infrastructure & Amenities
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { icon: 'fa-hospital', value: cityData.infrastructure.hospitals, label: 'Hospitals', color: 'red' },
                { icon: 'fa-school', value: cityData.infrastructure.schools, label: 'Schools', color: 'yellow' },
                { icon: 'fa-train', value: cityData.infrastructure.railwayStations, label: 'Railway Stations', color: 'blue' },
                { icon: 'fa-graduation-cap', value: cityData.infrastructure.colleges, label: 'Colleges', color: 'purple' },
              ].map((item, index) => (
                <div 
                  key={index} 
                  className={`rounded-xl shadow-sm border p-4 sm:p-6 flex items-center gap-4 ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-lg sm:text-xl ${
                    darkMode 
                      ? `bg-${item.color}-900/30 text-${item.color}-400`
                      : `bg-${item.color}-50 text-${item.color}-500`
                  }`}>
                    <i className={`fas ${item.icon}`}></i>
                  </div>
                  <div>
                    <h4 className={`text-xl sm:text-2xl font-bold ${
                      darkMode ? 'text-white' : 'text-slate-800'
                    }`}>
                      {item.value.toLocaleString()}
                    </h4>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                      {item.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* About Section */}
          <section id="history" className={`rounded-2xl p-6 sm:p-8 shadow-sm border ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'
          }`}>
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="lg:w-2/3">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className={`text-2xl font-bold ${
                    darkMode ? 'text-white' : 'text-slate-800'
                  }`}>About {cityData.city.name}</h2>
                  <img 
                    src={cityData.wikipedia.thumbnail.source} 
                    alt="Wiki Logo" 
                    className="w-6 h-6 rounded-full opacity-50"
                  />
                </div>
                <div className={`prose max-w-none ${
                  darkMode ? 'text-gray-300' : 'text-slate-600'
                }`}>
                  <p className="leading-relaxed">
                    {cityData.wikipedia.extract}
                  </p>
                </div>
              </div>
              
              <div className="lg:w-1/3">
                <div className={`rounded-xl p-6 border h-full ${
                  darkMode ? 'bg-gray-900 border-gray-700' : 'bg-slate-50 border-slate-100'
                }`}>
                  <h3 className={`font-semibold mb-4 ${
                    darkMode ? 'text-white' : 'text-slate-800'
                  }`}>Key Facts</h3>
                  <ul className="space-y-4">
                    <li className="flex justify-between border-b pb-2 border-gray-700">
                      <span className={darkMode ? 'text-gray-400' : 'text-slate-500'}>Population</span>
                      <span className={darkMode ? 'text-white' : 'font-medium'}>
                        {(cityData.population / 1000000).toFixed(1)}M
                      </span>
                    </li>
                    <li className="flex justify-between border-b pb-2 border-gray-700">
                      <span className={darkMode ? 'text-gray-400' : 'text-slate-500'}>Area</span>
                      <span className={darkMode ? 'text-white' : 'font-medium'}>{cityData.area} km²</span>
                    </li>
                    <li className="flex justify-between border-b pb-2 border-gray-700">
                      <span className={darkMode ? 'text-gray-400' : 'text-slate-500'}>Timezone</span>
                      <span className={darkMode ? 'text-white' : 'font-medium'}>IST (UTC+5:30)</span>
                    </li>
                    <li className="flex justify-between pt-2">
                      <span className={darkMode ? 'text-gray-400' : 'text-slate-500'}>Elevation</span>
                      <span className={darkMode ? 'text-white' : 'font-medium'}>214m</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* Footer - UPDATED with email and removed Twitter */}
        <footer className={`py-12 mt-12 ${
          darkMode ? 'bg-gray-900 text-gray-400' : 'bg-slate-900 text-slate-400'
        }`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              <div className="col-span-1 md:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                    darkMode ? 'bg-blue-500 text-white' : 'bg-blue-600 text-white'
                  }`}>
                    <i className="fas fa-city"></i>
                  </div>
                  <span className="text-lg font-bold text-white">CityData.Org</span>
                </div>
                <p className="text-sm leading-relaxed max-w-xs">
                  Open-source city profiling platform providing real-time data on demographics, environment, and infrastructure for Indian cities.
                </p>
              </div>
              
              <div>
                <h4 className="text-white font-semibold mb-4">Data Sources</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="#" className="hover:text-blue-400 transition-colors">OpenWeatherMap</a></li>
                  <li><a href="#" className="hover:text-blue-400 transition-colors">OpenAQ</a></li>
                  <li><a href="#" className="hover:text-blue-400 transition-colors">Census India</a></li>
                  <li><a href="#" className="hover:text-blue-400 transition-colors">OpenStreetMap</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-white font-semibold mb-4">Legal</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="#" className="hover:text-blue-400 transition-colors">Privacy Policy</a></li>
                  <li><a href="#" className="hover:text-blue-400 transition-colors">Terms of Use</a></li>
                  <li><a href="#" className="hover:text-blue-400 transition-colors">API Access</a></li>
                  <li><a href="#" className="hover:text-blue-400 transition-colors">Contact Us</a></li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-xs">© 2025 CityData.Org. All rights reserved.</p>
              <div className="flex gap-4">
                <a 
                  href="https://github.com/SurajSingh9696" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-white transition-colors"
                  title="GitHub Profile"
                >
                  <i className="fab fa-github text-lg"></i>
                </a>
                <a 
                  href="https://www.linkedin.com/in/suraj-singh-070a73213" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-white transition-colors"
                  title="LinkedIn Profile"
                >
                  <i className="fab fa-linkedin text-lg"></i>
                </a>
                <a 
                  href="mailto:otheruse998877@gmail.com" 
                  className="text-slate-400 hover:text-white transition-colors"
                  title="Send Email"
                >
                  <i className="fas fa-envelope text-lg"></i>
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Error message if API fails */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {error}
          <button 
            onClick={() => setError(null)}
            className="ml-2 text-sm hover:text-gray-200"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}
    </div>
  );
};

export default CityDataDashboard;