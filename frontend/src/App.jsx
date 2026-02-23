import React, { useState, useEffect, useRef } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
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

// Toast Notification Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    success: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border-emerald-500',
    error: 'bg-rose-50 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200 border-rose-500',
    warning: 'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-500',
    info: 'bg-sky-50 dark:bg-sky-900/30 text-sky-800 dark:text-sky-200 border-sky-500'
  };

  const icons = {
    success: 'fa-circle-check',
    error: 'fa-circle-xmark',
    warning: 'fa-triangle-exclamation',
    info: 'fa-circle-info'
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 rounded-xl border-l-4 shadow-2xl ${colors[type]} p-4 min-w-[320px] max-w-md animate-slide-in-right backdrop-blur-md`}>
      <div className="flex items-start gap-3">
        <i className={`fas ${icons[type]} text-xl mt-0.5`}></i>
        <div className="flex-1">
          <p className="font-medium text-sm">{message}</p>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
          <i className="fas fa-times"></i>
        </button>
      </div>
    </div>
  );
};

// Loading Skeleton Component
const LoadingSkeleton = ({ darkMode }) => {
  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-950' : 'bg-gradient-to-br from-slate-50 via-white to-slate-100'} transition-all duration-700`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8 animate-pulse">
        {/* Hero Skeleton */}
        <div className={`h-64 rounded-3xl ${darkMode ? 'bg-gray-800' : 'bg-slate-200'}`}></div>
        
        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`h-28 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-slate-200'}`}></div>
          ))}
        </div>
        
        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className={`h-64 rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-slate-200'}`}></div>
          ))}
        </div>
      </div>
    </div>
  );
};

const CityDataDashboard = () => {
  const [cityData, setCityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchCity, setSearchCity] = useState('Delhi');
  const [inputCity, setInputCity] = useState('Delhi');
  const [darkMode, setDarkMode] = useState(() => {
    // Check system preference on first load
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [toast, setToast] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const reportRef = useRef(null);
  const maxRetries = 3;

  // Apply theme to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Show toast notification
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  // Toggle dark mode with smooth transition
  const toggleDarkMode = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setDarkMode(!darkMode);
      setIsTransitioning(false);
    }, 150);
  };

  // Download PDF Report
  const downloadPDFReport = async () => {
    if (!cityData || generatingPDF) return;
    
    setGeneratingPDF(true);
    showToast('Generating PDF report...', 'info');
    
    try {
      // Dynamically import PDF libraries only when needed
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);
      
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
          <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #8b5cf6; padding-bottom: 20px;">
            <h1 style="color: #6d28d9; font-size: 28px; margin-bottom: 5px;">CityData.Org</h1>
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
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
              <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px;">
                <p style="color: #6b7280; font-size: 12px; margin-bottom: 5px;">City Name</p>
                <p style="color: #111827; font-size: 18px; font-weight: bold;">${cityData.city.name}</p>
              </div>
              <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px;">
                <p style="color: #6b7280; font-size: 12px; margin-bottom: 5px;">Population</p>
                <p style="color: #111827; font-size: 18px; font-weight: bold;">${(cityData.population / 1000000).toFixed(1)} Million</p>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; font-size: 12px;">
            <p>Report generated by CityData.Org - Comprehensive City Intelligence Platform</p>
          </div>
        </div>
      `;
      
      document.body.appendChild(tempElement);
      await new Promise(resolve => setTimeout(resolve, 100));
      
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
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;
      
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`${cityData.city.name}_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      
      document.body.removeChild(tempElement);
      showToast('PDF report downloaded successfully!', 'success');
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast('Failed to generate PDF. Please try again.', 'error');
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Fetch city data from API with retry logic
  const fetchCityData = async (city, isRetry = false) => {
    if (!isRetry) {
      setLoading(true);
      setError(null);
      setRetryCount(0);
    }
    
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await axios.get(`${API_BASE_URL}/api`, {
        params: { city },
        timeout: 15000, // 15 second timeout
      });
      
      if (response.data) {
        setCityData(response.data);
        setError(null);
        setRetryCount(0);
        showToast(`Successfully loaded data for ${city}`, 'success');
      } else {
        throw new Error('No data received from server');
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      
      const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch city data';
      
      // Retry logic
      if (retryCount < maxRetries && !err.response?.status === 404) {
        const nextRetry = retryCount + 1;
        setRetryCount(nextRetry);
        showToast(`Retrying... (${nextRetry}/${maxRetries})`, 'warning');
        
        // Exponential backoff
        setTimeout(() => {
          fetchCityData(city, true);
        }, Math.pow(2, nextRetry) * 1000);
      } else {
        setError(errorMessage);
        showToast(errorMessage, 'error');
        
        // Show with sample data  
        if (err.response?.status === 404) {
          showToast(`City "${city}" not found. Showing sample data for Delhi instead.`, 'warning');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCityData(searchCity);
  }, [searchCity]);

  const handleSearch = (e) => {
    e.preventDefault();
    const trimmedCity = inputCity.trim();
    if (trimmedCity && trimmedCity !== searchCity) {
      setSearchCity(trimmedCity);
    } else if (!trimmedCity) {
      showToast('Please enter a city name', 'warning');
    }
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
    if (aqi <= 50) return 'text-emerald-500';
    if (aqi <= 100) return 'text-yellow-500';
    if (aqi <= 150) return 'text-orange-500';
    if (aqi <= 200) return 'text-rose-500';
    if (aqi <= 300) return 'text-purple-500';
    return 'text-red-700';
  };

  const getAQIBackground = (aqi) => {
    if (aqi <= 50) return 'bg-emerald-100 dark:bg-emerald-900/20';
    if (aqi <= 100) return 'bg-yellow-100 dark:bg-yellow-900/20';
    if (aqi <= 150) return 'bg-orange-100 dark:bg-orange-900/20';
    if (aqi <= 200) return 'bg-rose-100 dark:bg-rose-900/20';
    if (aqi <= 300) return 'bg-purple-100 dark:bg-purple-900/20';
    return 'bg-red-100 dark:bg-red-900/20';
  };

  const getAQIBorderColor = (aqi) => {
    if (aqi <= 50) return 'border-emerald-500';
    if (aqi <= 100) return 'border-yellow-500';
    if (aqi <= 150) return 'border-orange-500';
    if (aqi <= 200) return 'border-rose-500';
    if (aqi <= 300) return 'border-purple-500';
    return 'border-red-700';
  };

  // Loading state
  if (loading) {
    return <LoadingSkeleton darkMode={darkMode} />;
  }

  // Error state with retry
  if (error && !cityData) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-all duration-700 ${
        darkMode ? 'bg-gray-950' : 'bg-gradient-to-br from-slate-50 via-white to-slate-100'
      }`}>
        <div className="text-center max-w-md px-6 animate-fade-in">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center transform hover:scale-110 transition-transform duration-300">
            <i className="fas fa-exclamation-triangle text-3xl text-white"></i>
          </div>
          <h2 className={`text-2xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
            Oops! Something went wrong
          </h2>
          <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-slate-600'}`}>
            {error}
          </p>
          <div className="flex gap-3 justify-center">
            <button 
              onClick={() => fetchCityData(searchCity)}
              className="px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl hover:from-violet-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl font-medium"
            >
              <i className="fas fa-redo mr-2"></i>
              Try Again
            </button>
            <button 
              onClick={() => {
                setInputCity('Delhi');
                setSearchCity('Delhi');
              }}
              className={`px-6 py-3 rounded-xl transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl font-medium ${
                darkMode 
                  ? 'bg-gray-800 text-white hover:bg-gray-700' 
                  : 'bg-white text-slate-800 hover:bg-slate-50'
              } border ${darkMode ? 'border-gray-700' : 'border-slate-200'}`}
            >
              <i className="fas fa-home mr-2"></i>
              Go to Default
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!cityData) return null;

  // Weather Chart Data with theme-aware colors
  const weatherChartData = {
    labels: cityData.weather.daily.time.map(date => 
      new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    ),
    datasets: [
      {
        label: 'Max Temp (°C)',
        data: cityData.weather.daily.temperature_2m_max,
        borderColor: darkMode ? '#fb923c' : '#f97316',
        backgroundColor: darkMode ? 'rgba(251, 146, 60, 0.15)' : 'rgba(249, 115, 22, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: darkMode ? '#fb923c' : '#f97316',
        borderWidth: 3
      },
      {
        label: 'Min Temp (°C)',
        data: cityData.weather.daily.temperature_2m_min,
        borderColor: darkMode ? '#60a5fa' : '#3b82f6',
        backgroundColor: 'transparent',
        tension: 0.4,
        borderDash: [5, 5],
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: darkMode ? '#60a5fa' : '#3b82f6',
        borderWidth: 2
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
          color: darkMode ? '#d1d5db' : '#374151',
          font: {
            size: 12,
            weight: '500'
          },
          padding: 15,
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: darkMode ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.95)',
        titleColor: darkMode ? '#f3f4f6' : '#1f2937',
        bodyColor: darkMode ? '#d1d5db' : '#374151',
        borderColor: darkMode ? '#4b5563' : '#e5e7eb',
        borderWidth: 1,
        cornerRadius: 10,
        padding: 12,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 }
      }
    },
    scales: {
      y: { 
        beginAtZero: false,
        grid: { 
          color: darkMode ? '#374151' : '#f1f5f9',
          drawBorder: false
        },
        ticks: {
          color: darkMode ? '#d1d5db' : '#374151',
          font: { size: 11 }
        }
      },
      x: { 
        grid: { display: false },
        ticks: {
          color: darkMode ? '#d1d5db' : '#374151',
          font: { size: 11 }
        }
      }
    },
    animation: {
      duration: 1200,
      easing: 'easeInOutQuart'
    }
  };

  // AQI Chart Data with dynamic colors
  const aqiChartData = {
    labels: cityData.airQuality.history.slice(0, 8).map(item => 
      new Date(item.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    ),
    datasets: [{
      label: 'PM2.5 (µg/m³)',
      data: cityData.airQuality.history.slice(0, 8).map(item => item.pm25),
      backgroundColor: cityData.airQuality.history.slice(0, 8).map(item => {
        if (item.pm25 > 150) return darkMode ? 'rgba(239, 68, 68, 0.8)' : '#ef4444';
        if (item.pm25 > 100) return darkMode ? 'rgba(249, 115, 22, 0.8)' : '#f97316';
        if (item.pm25 > 50) return darkMode ? 'rgba(234, 179, 8, 0.8)' : '#eab308';
        return darkMode ? 'rgba(16, 185, 129, 0.8)' : '#10b981';
      }),
      borderColor: cityData.airQuality.history.slice(0, 8).map(item => {
        if (item.pm25 > 150) return '#dc2626';
        if (item.pm25 > 100) return '#ea580c';
        if (item.pm25 > 50) return '#ca8a04';
        return '#059669';
      }),
      borderWidth: 2,
      borderRadius: 8,
      barPercentage: 0.7,
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
          font: { size: 12, weight: '500' },
          padding: 15,
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: darkMode ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.95)',
        titleColor: darkMode ? '#f3f4f6' : '#1f2937',
        bodyColor: darkMode ? '#d1d5db' : '#374151',
        borderColor: darkMode ? '#4b5563' : '#e5e7eb',
        borderWidth: 1,
        cornerRadius: 10,
        padding: 12
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
          font: { size: 11 }
        }
      },
      x: { 
        grid: { display: false },
        ticks: {
          color: darkMode ? '#d1d5db' : '#374151',
          font: { size: 11 }
        }
      }
    },
    animation: {
      duration: 1200,
      easing: 'easeInOutQuart'
    }
  };

  const cityImage = CITY_IMAGES[cityData.city.name] || CITY_IMAGES.default;

  return (
    <div className={`min-h-screen transition-all duration-700 ${
      darkMode ? 'bg-gray-950 text-white' : 'bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-800'
    } ${isTransitioning ? 'opacity-50' : 'opacity-100'}`}>
      {/* Toast Notifications */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 backdrop-blur-xl border-b transition-all duration-500 ${
        darkMode 
          ? 'bg-gray-900/80 border-gray-800' 
          : 'bg-white/90 border-slate-200 shadow-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3 group cursor-pointer">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all duration-300 group-hover:scale-110 ${
                darkMode 
                  ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white' 
                  : 'bg-gradient-to-br from-violet-600 to-purple-700 text-white'
              } shadow-lg`}>
                <i className="fas fa-city"></i>
              </div>
              <span className={`text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${
                darkMode ? 'from-violet-400 to-purple-400' : 'from-violet-600 to-purple-600'
              }`}>
                CityData.Org
              </span>
            </div>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8 relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <i className={`fas fa-magnifying-glass transition-colors duration-300 ${
                  darkMode ? 'text-gray-400 group-focus-within:text-violet-400' : 'text-slate-400 group-focus-within:text-violet-600'
                }`}></i>
              </div>
              <input
                type="text"
                value={inputCity}
                onChange={(e) => setInputCity(e.target.value)}
                className={`block w-full pl-11 pr-11 py-2.5 border rounded-2xl leading-5 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all duration-300 sm:text-sm ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-700 text-white focus:ring-violet-500/50 focus:border-violet-500 focus:bg-gray-750' 
                    : 'bg-slate-50 border-slate-200 focus:ring-violet-500/30 focus:border-violet-500 focus:bg-white'
                }`}
                placeholder="Search city (e.g. Mumbai, Bangalore)..."
              />
              <button 
                type="submit"
                className="absolute inset-y-0 right-0 pr-4 flex items-center transition-all duration-300 hover:scale-110"
              >
                <i className={`fas fa-location-crosshairs ${
                  darkMode ? 'text-violet-400 hover:text-violet-300' : 'text-violet-600 hover:text-violet-700'
                }`}></i>
              </button>
            </form>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              <button 
                onClick={toggleDarkMode}
                className={`p-2.5 rounded-xl transition-all duration-300 transform hover:scale-110 hover:rotate-12 ${
                  darkMode 
                    ? 'text-amber-300 hover:text-amber-200 bg-gray-800 hover:bg-gray-750' 
                    : 'text-slate-600 hover:text-violet-600 bg-slate-100 hover:bg-slate-200'
                }`}
                title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                <i className={`fas ${darkMode ? 'fa-sun' : 'fa-moon'} text-lg`}></i>
              </button>
              <button 
                onClick={downloadPDFReport}
                disabled={generatingPDF}
                className={`hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-300 text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
                  darkMode 
                    ? 'bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white' 
                    : 'bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white'
                }`}
              >
                {generatingPDF ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-download"></i>
                    <span>Download Report</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden px-4 pb-3">
          <form onSubmit={handleSearch} className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <i className={`fas fa-magnifying-glass ${darkMode ? 'text-gray-400' : 'text-slate-400'}`}></i>
            </div>
            <input
              type="text"
              value={inputCity}
              onChange={(e) => setInputCity(e.target.value)}
              className={`block w-full pl-11 pr-11 py-2.5 border rounded-2xl leading-5 text-sm transition-all duration-300 ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:ring-violet-500/50' 
                  : 'bg-slate-50 border-slate-200 placeholder-slate-400 focus:ring-violet-500/30'
              } focus:outline-none focus:ring-2`}
              placeholder="Search city..."
            />
            <button type="submit" className="absolute inset-y-0 right-0 pr-4">
              <i className={`fas fa-location-crosshairs ${
                darkMode ? 'text-violet-400' : 'text-violet-600'
              }`}></i>
            </button>
          </form>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-16">
        {/* Hero Section */}
        <header className="relative overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img 
              src={cityImage} 
              alt={`${cityData.city.name} cityscape`}
              className="w-full h-full object-cover opacity-30 dark:opacity-20 transition-opacity duration-700"
            />
            <div className={`absolute inset-0 bg-gradient-to-b ${
              darkMode 
                ? 'from-gray-950/80 via-gray-950/60 to-gray-950' 
                : 'from-slate-900/70 via-slate-900/50 to-slate-50'
            } transition-all duration-700`}></div>
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
            <div className="flex flex-col lg:flex-row justify-between items-end gap-8 animate-fade-in-up">
              <div className="space-y-5">
                <div className="flex items-center gap-3 animate-slide-in-left">
                  <span className="px-4 py-1.5 bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-semibold rounded-full uppercase tracking-wider backdrop-blur-sm">
                    Major City
                  </span>
                  <span className={`px-4 py-1.5 border text-xs font-semibold rounded-full uppercase tracking-wider backdrop-blur-sm ${
                    darkMode 
                      ? 'bg-gray-800/50 border-gray-700 text-gray-300' 
                      : 'bg-slate-700/30 border-slate-600 text-slate-200'
                  }`}>
                    India
                  </span>
                </div>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white drop-shadow-2xl animate-slide-in-left animation-delay-100">
                  {cityData.city.name}
                </h1>
                <div className="flex flex-wrap items-center gap-6 text-slate-200 text-sm md:text-base animate-slide-in-left animation-delay-200">
                  <div className="flex items-center gap-2 hover:text-white transition-colors duration-300">
                    <i className="fas fa-map-pin text-violet-400"></i>
                    <span>{cityData.city.displayName}</span>
                  </div>
                  <div className="flex items-center gap-2 hover:text-white transition-colors duration-300">
                    <i className="fas fa-compass text-violet-400"></i>
                    <span>{cityData.city.lat.toFixed(2)}° N, {cityData.city.lon.toFixed(2)}° E</span>
                  </div>
                  <div className="flex items-center gap-2 hover:text-white transition-colors duration-300">
                    <i className="fas fa-mountain text-violet-400"></i>
                    <span>214m Elevation</span>
                  </div>
                </div>
              </div>
              
              {/* Leaflet Map */}
              <div className="w-full lg:w-72 h-56 lg:h-40 rounded-2xl overflow-hidden border shadow-2xl relative animate-slide-in-right ${
                darkMode ? 'border-gray-700' : 'border-slate-600'
              }">
                <MapContainer
                  center={[cityData.city.lat, cityData.city.lon]}
                  zoom={12}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={false}
                  className="z-10"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[cityData.city.lat, cityData.city.lon]}>
                    <Popup>
                      <b>{cityData.city.name}</b><br />
                      Lat: {cityData.city.lat.toFixed(4)}<br />
                      Lon: {cityData.city.lon.toFixed(4)}
                    </Popup>
                  </Marker>
                </MapContainer>
                <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md rounded-lg text-xs px-3 py-1.5 border border-white/20 text-white">
                  <i className="fas fa-map mr-1.5"></i>Interactive Map
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Quick Stats */}
        <section className="relative z-20 -mt-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 animate-fade-in-up animation-delay-300">
            {/* Population */}
            <div className={`rounded-2xl shadow-xl p-5 border-l-4 border-violet-500 transform hover:-translate-y-2 transition-all duration-500 hover:shadow-2xl animate-card-pop ${
              darkMode ? 'bg-gray-900' : 'bg-white'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className={`text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-400' : 'text-slate-500'
                  }`}>Population</p>
                  <h3 className={`text-2xl md:text-3xl font-bold mt-2 ${
                    darkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    {(cityData.population / 1000000).toFixed(1)}M
                  </h3>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:rotate-12 ${
                  darkMode ? 'bg-violet-900/30 text-violet-400' : 'bg-violet-50 text-violet-600'
                }`}>
                  <i className="fas fa-users text-xl"></i>
                </div>
              </div>
              <p className={`text-xs mt-3 ${
                darkMode ? 'text-gray-500' : 'text-slate-400'
              }`}>Census 2011</p>
            </div>

            {/* Area */}
            <div className={`rounded-2xl shadow-xl p-5 border-l-4 border-emerald-500 transform hover:-translate-y-2 transition-all duration-500 hover:shadow-2xl animate-card-pop animation-delay-100 ${
              darkMode ? 'bg-gray-900' : 'bg-white'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className={`text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-400' : 'text-slate-500'
                  }`}>Area</p>
                  <h3 className={`text-2xl md:text-3xl font-bold mt-2 ${
                    darkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    {cityData.area.toLocaleString()} km²
                  </h3>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:rotate-12 ${
                  darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  <i className="fas fa-map text-xl"></i>
                </div>
              </div>
              <p className={`text-xs mt-3 ${
                darkMode ? 'text-gray-500' : 'text-slate-400'
              }`}>Total Area</p>
            </div>

            {/* AQI */}
            <div className={`rounded-2xl shadow-xl p-5 border-l-4 ${getAQIBorderColor(cityData.airQuality.currentAQI.aqi)} transform hover:-translate-y-2 transition-all duration-500 hover:shadow-2xl animate-card-pop animation-delay-200 ${
              darkMode ? 'bg-gray-900' : 'bg-white'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className={`text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-400' : 'text-slate-500'
                  }`}>Air Quality</p>
                  <h3 className={`text-2xl md:text-3xl font-bold mt-2 ${getAQIColor(cityData.airQuality.currentAQI.aqi)}`}>
                    {cityData.airQuality.currentAQI.aqi}
                  </h3>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:rotate-12 ${
                  getAQIBackground(cityData.airQuality.currentAQI.aqi)
                } ${getAQIColor(cityData.airQuality.currentAQI.aqi)}`}>
                  <i className="fas fa-mask-face text-xl"></i>
                </div>
              </div>
              <span className={`inline-block mt-3 px-3 py-1 text-xs rounded-full font-medium ${
                getAQIBackground(cityData.airQuality.currentAQI.aqi)
              } ${getAQIColor(cityData.airQuality.currentAQI.aqi)}`}>
                {cityData.airQuality.currentAQI.category}
              </span>
            </div>

            {/* Temperature */}
            <div className={`rounded-2xl shadow-xl p-5 border-l-4 border-orange-500 transform hover:-translate-y-2 transition-all duration-500 hover:shadow-2xl animate-card-pop animation-delay-300 ${
              darkMode ? 'bg-gray-900' : 'bg-white'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className={`text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-400' : 'text-slate-500'
                  }`}>Temperature</p>
                  <h3 className={`text-2xl md:text-3xl font-bold mt-2 ${
                    darkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    {cityData.weather.current_weather.temperature}°C
                  </h3>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:rotate-12 ${
                  darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-50 text-orange-500'
                }`}>
                  <i className={`fas ${getWeatherIcon(cityData.weather.current_weather.weathercode, cityData.weather.current_weather.is_day)} text-xl`}></i>
                </div>
              </div>
              <p className={`text-xs mt-3 ${
                darkMode ? 'text-gray-500' : 'text-slate-400'
              }`}>Wind: {cityData.weather.current_weather.windspeed} km/h</p>
            </div>

            {/* Hospitals */}
            <div className={`rounded-2xl shadow-xl p-5 border-l-4 border-rose-500 transform hover:-translate-y-2 transition-all duration-500 hover:shadow-2xl animate-card-pop animation-delay-400 ${
              darkMode ? 'bg-gray-900' : 'bg-white'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className={`text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-400' : 'text-slate-500'
                  }`}>Hospitals</p>
                  <h3 className={`text-2xl md:text-3xl font-bold mt-2 ${
                    darkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    {cityData.infrastructure.hospitals}
                  </h3>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:rotate-12 ${
                  darkMode ? 'bg-rose-900/30 text-rose-400' : 'bg-rose-50 text-rose-600'
                }`}>
                  <i className="fas fa-hospital text-xl"></i>
                </div>
              </div>
              <p className={`text-xs mt-3 ${
                darkMode ? 'text-gray-500' : 'text-slate-400'
              }`}>Registered Facilities</p>
            </div>
          </div>
        </section>

        {/* Main Dashboard Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
          {/* Weather Section */}
          <section id="weather" className="animate-fade-in-up animation-delay-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <h2 className={`text-3xl font-bold flex items-center gap-3 ${
                darkMode ? 'text-white' : 'text-slate-900'
              }`}>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center">
                  <i className="fas fa-cloud-sun text-white"></i>
                </div>
                Weather Forecast
              </h2>
              <span className={`text-sm px-4 py-2 rounded-full ${
                darkMode ? 'bg-gray-800 text-gray-400' : 'bg-slate-100 text-slate-600'
              }`}>
                <i className="fas fa-database mr-2"></i>
                Source: Open-Meteo API
              </span>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Current Weather Card */}
              <div className="bg-gradient-to-br from-sky-500 to-blue-600 dark:from-sky-600 dark:to-blue-700 rounded-3xl p-6 text-white shadow-2xl transform hover:scale-105 transition-all duration-500 hover:shadow-3xl">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sky-100 font-medium mb-1">Right Now</p>
                    <h3 className="text-6xl font-bold mt-2 drop-shadow-lg">
                      {cityData.weather.current_weather.temperature}°C
                    </h3>
                    <p className="text-sky-100 mt-2 capitalize text-lg">
                      {cityData.weather.current_weather.weathercode === 0 ? 'Clear Sky' : 'Partly Cloudy'}
                    </p>
                  </div>
                  <i className={`fas ${getWeatherIcon(cityData.weather.current_weather.weathercode, cityData.weather.current_weather.is_day)} text-6xl text-yellow-300 animate-pulse drop-shadow-xl`}></i>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-8">
                  <div className="bg-white/15 rounded-xl p-4 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-300">
                    <div className="flex items-center gap-2 text-sky-100 text-xs mb-2">
                      <i className="fas fa-wind"></i> Wind Speed
                    </div>
                    <p className="font-bold text-lg">{cityData.weather.current_weather.windspeed} km/h</p>
                  </div>
                  <div className="bg-white/15 rounded-xl p-4 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-300">
                    <div className="flex items-center gap-2 text-sky-100 text-xs mb-2">
                      <i className="fas fa-compass"></i> Direction
                    </div>
                    <p className="font-bold text-lg">{cityData.weather.current_weather.winddirection}°</p>
                  </div>
                </div>
              </div>

              {/* 7-Day Forecast Chart */}
              <div className={`lg:col-span-2 rounded-3xl p-6 shadow-xl border transform hover:scale-[1.02] transition-all duration-500 ${
                darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'
              }`}>
                <h3 className={`text-lg font-semibold mb-6 flex items-center gap-2 ${
                  darkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  <i className="fas fa-chart-line text-sky-500"></i>
                  7-Day Temperature Trend
                </h3>
                <div className="h-64 w-full">
                  <Line data={weatherChartData} options={weatherChartOptions} />
                </div>
              </div>
            </div>
          </section>

          {/* Pollution Section */}
          <section id="pollution" className="animate-fade-in-up animation-delay-600">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <h2 className={`text-3xl font-bold flex items-center gap-3 ${
                darkMode ? 'text-white' : 'text-slate-900'
              }`}>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                  <i className="fas fa-smog text-white"></i>
                </div>
                Air Quality Index
              </h2>
              <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                getAQIBackground(cityData.airQuality.currentAQI.aqi)
              } ${getAQIColor(cityData.airQuality.currentAQI.aqi)}`}>
                {cityData.airQuality.currentAQI.category}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main AQI Gauge */}
              <div className={`rounded-3xl p-8 shadow-xl border flex flex-col items-center justify-center text-center transform hover:scale-105 transition-all duration-500 ${
                darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'
              }`}>
                <div className="relative w-48 h-48 flex items-center justify-center mb-6">
                  {/* AQI Gauge Ring */}
                  <div className="absolute inset-0 rounded-full" style={{
                    background: `conic-gradient(
                      #10b981 0% 10%,
                      #eab308 10% 20%,
                      #f97316 20% 40%,
                      #ef4444 40% 80%,
                      #a855f7 80% 92%,
                      ${darkMode ? '#374151' : '#f3f4f6'} 92% 100%
                    )`,
                    transform: 'rotate(-126deg)',
                    boxShadow: darkMode ? '0 0 30px rgba(139, 92, 246, 0.3)' : '0 0 30px rgba(139, 92, 246, 0.2)'
                  }}></div>
                  <div className="absolute inset-5 rounded-full flex flex-col items-center justify-center backdrop-blur-xl" style={{
                    background: darkMode 
                      ? 'radial-gradient(circle, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.9))' 
                      : 'radial-gradient(circle, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.95))',
                    boxShadow: darkMode 
                      ? 'inset 0 0 20px rgba(0, 0, 0, 0.5)'
                      : 'inset 0 0 20px rgba(0, 0, 0, 0.1)'
                  }}>
                    <span className={`text-5xl font-black ${getAQIColor(cityData.airQuality.currentAQI.aqi)} drop-shadow-lg`}>
                      {cityData.airQuality.currentAQI.aqi}
                    </span>
                    <span className={`text-xs mt-2 uppercase tracking-wider font-semibold ${
                      darkMode ? 'text-gray-400' : 'text-slate-500'
                    }`}>
                      US AQI
                    </span>
                  </div>
                </div>
                <h3 className={`text-2xl font-bold mb-3 ${getAQIColor(cityData.airQuality.currentAQI.aqi)}`}>
                  {cityData.airQuality.currentAQI.category}
                </h3>
                <p className={`text-sm mb-6 px-4 leading-relaxed ${
                  darkMode ? 'text-gray-400' : 'text-slate-600'
                }`}>
                  Health warnings of emergency conditions. The entire population is more likely to be affected.
                </p>
                
                <div className="w-full grid grid-cols-2 gap-3">
                  <div className={`p-3 rounded-xl text-center transition-all duration-300 hover:scale-105 ${
                    darkMode ? 'bg-gray-800 hover:bg-gray-750' : 'bg-slate-50 hover:bg-slate-100'
                  }`}>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>Dominant</p>
                    <p className={`font-bold mt-1 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                      {cityData.airQuality.currentAQI.dominentPollutant?.toUpperCase()}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl text-center transition-all duration-300 hover:scale-105 ${
                    darkMode ? 'bg-gray-800 hover:bg-gray-750' : 'bg-slate-50 hover:bg-slate-100'
                  }`}>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>Source</p>
                    <p className={`font-bold mt-1 ${darkMode ? 'text-white' : 'text-slate-800'}`}>WAQI</p>
                  </div>
                </div>
              </div>

              {/* Pollutants Breakdown */}
              <div className={`rounded-3xl p-6 shadow-xl border transform hover:scale-[1.02] transition-all duration-500 ${
                darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'
              }`}>
                <h3 className={`text-lg font-semibold mb-6 flex items-center gap-2 ${
                  darkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  <i className="fas fa-mask-ventilator text-purple-500"></i>
                  Pollutant Levels
                </h3>
                <div className="space-y-6">
                  {/* PM2.5 */}
                  <div className="group">
                    <div className="flex justify-between text-sm mb-2">
                      <span className={`font-semibold flex items-center gap-2 ${
                        darkMode ? 'text-gray-300' : 'text-slate-700'
                      }`}>
                        <span className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-500 to-rose-500"></span>
                        PM2.5
                      </span>
                      <span className={`font-bold tabular-nums ${getAQIColor(cityData.airQuality.currentAQI.pollutants.pm25 * 2)}`}>
                        {cityData.airQuality.currentAQI.pollutants.pm25} µg/m³
                      </span>
                    </div>
                    <div className={`w-full h-3 rounded-full overflow-hidden ${
                      darkMode ? 'bg-gray-800' : 'bg-slate-100'
                    }`}>
                      <div 
                        className="h-3 rounded-full bg-gradient-to-r from-emerald-500 via-yellow-500 via-orange-500 to-rose-500 transition-all duration-1000 ease-out"
                        style={{ width: `${Math.min((cityData.airQuality.currentAQI.pollutants.pm25 / 250) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* PM10 */}
                  <div className="group">
                    <div className="flex justify-between text-sm mb-2">
                      <span className={`font-semibold flex items-center gap-2 ${
                        darkMode ? 'text-gray-300' : 'text-slate-700'
                      }`}>
                        <span className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-500 to-rose-500"></span>
                        PM10
                      </span>
                      <span className={`font-bold tabular-nums ${getAQIColor(cityData.airQuality.currentAQI.pollutants.pm10 * 2)}`}>
                        {cityData.airQuality.currentAQI.pollutants.pm10} µg/m³
                      </span>
                    </div>
                    <div className={`w-full h-3 rounded-full overflow-hidden ${
                      darkMode ? 'bg-gray-800' : 'bg-slate-100'
                    }`}>
                      <div 
                        className="h-3 rounded-full bg-gradient-to-r from-emerald-500 via-yellow-500 via-orange-500 to-rose-500 transition-all duration-1000 ease-out"
                        style={{ width: `${Math.min((cityData.airQuality.currentAQI.pollutants.pm10 / 350) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* NO2 */}
                  <div className="group">
                    <div className="flex justify-between text-sm mb-2">
                      <span className={`font-semibold flex items-center gap-2 ${
                        darkMode ? 'text-gray-300' : 'text-slate-700'
                      }`}>
                        <span className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-500 to-rose-500"></span>
                        NO₂
                      </span>
                      <span className={`font-bold tabular-nums ${getAQIColor(cityData.airQuality.currentAQI.pollutants.no2 * 4)}`}>
                        {cityData.airQuality.currentAQI.pollutants.no2} µg/m³
                      </span>
                    </div>
                    <div className={`w-full h-3 rounded-full overflow-hidden ${
                      darkMode ? 'bg-gray-800' : 'bg-slate-100'
                    }`}>
                      <div 
                        className="h-3 rounded-full bg-gradient-to-r from-emerald-500 via-yellow-500 via-orange-500 to-rose-500 transition-all duration-1000 ease-out"
                        style={{ width: `${Math.min((cityData.airQuality.currentAQI.pollutants.no2 / 80) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* SO2 */}
                  <div className="group">
                    <div className="flex justify-between text-sm mb-2">
                      <span className={`font-semibold flex items-center gap-2 ${
                        darkMode ? 'text-gray-300' : 'text-slate-700'
                      }`}>
                        <span className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-500 to-rose-500"></span>
                        SO₂
                      </span>
                      <span className={`font-bold tabular-nums ${getAQIColor(cityData.airQuality.currentAQI.pollutants.so2 * 4)}`}>
                        {cityData.airQuality.currentAQI.pollutants.so2} µg/m³
                      </span>
                    </div>
                    <div className={`w-full h-3 rounded-full overflow-hidden ${
                      darkMode ? 'bg-gray-800' : 'bg-slate-100'
                    }`}>
                      <div 
                        className="h-3 rounded-full bg-gradient-to-r from-emerald-500 via-yellow-500 via-orange-500 to-rose-500 transition-all duration-1000 ease-out"
                        style={{ width: `${Math.min((cityData.airQuality.currentAQI.pollutants.so2 / 80) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* O3 & CO */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-slate-50'}`}>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-slate-500'} mb-1`}>O₃</p>
                      <p className={`font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                        {cityData.airQuality.currentAQI.pollutants.o3}
                      </p>
                    </div>
                    <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-slate-50'}`}>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-slate-500'} mb-1`}>CO</p>
                      <p className={`font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                        {cityData.airQuality.currentAQI.pollutants.co}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 24h Trend Chart */}
              <div className={`rounded-3xl p-6 shadow-xl border transform hover:scale-[1.02] transition-all duration-500 ${
                darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'
              }`}>
                <h3 className={`text-lg font-semibold mb-6 flex items-center gap-2 ${
                  darkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  <i className="fas fa-chart-bar text-purple-500"></i>
                  Recent PM2.5 Trend
                </h3>
                <div className="h-52 w-full">
                  <Bar data={aqiChartData} options={aqiChartOptions} />
                </div>
                <div className={`mt-6 pt-4 border-t ${darkMode ? 'border-gray-800' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between text-xs gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                      <span className={darkMode ? 'text-gray-400' : 'text-slate-600'}>Good</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span className={darkMode ? 'text-gray-400' : 'text-slate-600'}>Moderate</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <span className={darkMode ? 'text-gray-400' : 'text-slate-600'}>Unhealthy</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                      <span className={darkMode ? 'text-gray-400' : 'text-slate-600'}>Hazardous</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Infrastructure Section */}
          <section id="infrastructure" className="animate-fade-in-up animation-delay-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-3xl font-bold flex items-center gap-3 ${
                darkMode ? 'text-white' : 'text-slate-900'
              }`}>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center">
                  <i className="fas fa-building-columns text-white"></i>
                </div>
                Infrastructure & Amenities
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { icon: 'fa-hospital', value: cityData.infrastructure.hospitals, label: 'Hospitals', color: 'rose', gradient: 'from-rose-400 to-rose-600' },
                { icon: 'fa-school', value: cityData.infrastructure.schools, label: 'Schools', color: 'amber', gradient: 'from-amber-400 to-amber-600' },
                { icon: 'fa-train', value: cityData.infrastructure.railwayStations, label: 'Railway Stations', color: 'blue', gradient: 'from-blue-400 to-blue-600' },
                { icon: 'fa-graduation-cap', value: cityData.infrastructure.colleges, label: 'Colleges', color: 'purple', gradient: 'from-purple-400 to-purple-600' },
              ].map((item, index) => (
                <div 
                  key={index} 
                  className={`rounded-2xl shadow-xl border p-6 flex items-center gap-4 transform hover:-translate-y-2 hover:shadow-2xl transition-all duration-500 ${
                    darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'
                  } animate-card-pop`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white text-2xl shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                    <i className={`fas ${item.icon}`}></i>
                  </div>
                  <div>
                    <h4 className={`text-3xl font-bold ${
                      darkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                      {item.value.toLocaleString()}
                    </h4>
                    <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-slate-600'}`}>
                      {item.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* About Section */}
          <section id="history" className={`rounded-3xl p-8 shadow-xl border animate-fade-in-up animation-delay-800 ${
            darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="lg:w-2/3">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                    <i className="fas fa-book text-white"></i>
                  </div>
                  <h2 className={`text-3xl font-bold ${
                    darkMode ? 'text-white' : 'text-slate-900'
                  }`}>About {cityData.city.name}</h2>
                  <img 
                    src={cityData.wikipedia.thumbnail?.source} 
                    alt="Wikipedia" 
                    className="w-6 h-6 rounded-full opacity-60"
                  />
                </div>
                <div className={`prose max-w-none leading-relaxed ${
                  darkMode ? 'text-gray-300' : 'text-slate-700'
                }`}>
                  <p className="text-base">
                    {cityData.wikipedia.extract}
                  </p>
                </div>
              </div>
              
              <div className="lg:w-1/3">
                <div className={`rounded-2xl p-6 border h-full ${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-slate-50 border-slate-200'
                }`}>
                  <h3 className={`font-semibold mb-6 text-lg ${
                    darkMode ? 'text-white' : 'text-slate-900'
                  }`}>Key Facts</h3>
                  <ul className="space-y-4">
                    <li className={`flex justify-between border-b pb-3 ${
                      darkMode ? 'border-gray-700' : 'border-slate-200'
                    }`}>
                      <span className={darkMode ? 'text-gray-400' : 'text-slate-600'}>Population</span>
                      <span className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {(cityData.population / 1000000).toFixed(1)}M
                      </span>
                    </li>
                    <li className={`flex justify-between border-b pb-3 ${
                      darkMode ? 'border-gray-700' : 'border-slate-200'
                    }`}>
                      <span className={darkMode ? 'text-gray-400' : 'text-slate-600'}>Area</span>
                      <span className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {cityData.area} km²
                      </span>
                    </li>
                    <li className={`flex justify-between border-b pb-3 ${
                      darkMode ? 'border-gray-700' : 'border-slate-200'
                    }`}>
                      <span className={darkMode ? 'text-gray-400' : 'text-slate-600'}>Timezone</span>
                      <span className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        IST (UTC+5:30)
                      </span>
                    </li>
                    <li className="flex justify-between pt-1">
                      <span className={darkMode ? 'text-gray-400' : 'text-slate-600'}>Elevation</span>
                      <span className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        214m
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className={`py-12 mt-16 ${
          darkMode ? 'bg-gray-950 text-gray-400 border-t border-gray-900' : 'bg-slate-900 text-slate-400'
        } transition-all duration-700`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              <div className="col-span-1 md:col-span-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                    darkMode ? 'bg-violet-500 text-white' : 'bg-violet-600 text-white'
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
                  <li>
                    <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer" className="hover:text-violet-400 transition-colors duration-300">
                      Open-Meteo API
                    </a>
                  </li>
                  <li>
                    <a href="https://waqi.info" target="_blank" rel="noopener noreferrer" className="hover:text-violet-400 transition-colors duration-300">
                      WAQI (Air Quality)
                    </a>
                  </li>
                  <li>
                    <a href="https://www.openstreetmap.org" target="_blank" rel="noopener noreferrer" className="hover:text-violet-400 transition-colors duration-300">
                      OpenStreetMap
                    </a>
                  </li>
                  <li>
                    <a href="https://nominatim.org" target="_blank" rel="noopener noreferrer" className="hover:text-violet-400 transition-colors duration-300">
                      Nominatim
                    </a>
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-white font-semibold mb-4">Legal</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="#" className="hover:text-violet-400 transition-colors duration-300">Privacy Policy</a></li>
                  <li><a href="#" className="hover:text-violet-400 transition-colors duration-300">Terms of Use</a></li>
                  <li><a href="#" className="hover:text-violet-400 transition-colors duration-300">API Access</a></li>
                  <li><a href="#" className="hover:text-violet-400 transition-colors duration-300">Contact Us</a></li>
                </ul>
              </div>
            </div>
            
            <div className={`border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4 ${
              darkMode ? 'border-gray-900' : 'border-slate-800'
            }`}>
              <p className="text-xs">© 2025 CityData.Org. All rights reserved.</p>
              <div className="flex gap-5">
                <a 
                  href="https://github.com/SurajSingh9696" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-white transition-all duration-300 transform hover:scale-125"
                  title="GitHub Profile"
                >
                  <i className="fab fa-github text-xl"></i>
                </a>
                <a 
                  href="https://www.linkedin.com/in/suraj-singh-070a73213" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-white transition-all duration-300 transform hover:scale-125"
                  title="LinkedIn Profile"
                >
                  <i className="fab fa-linkedin text-xl"></i>
                </a>
                <a 
                  href="mailto:otheruse998877@gmail.com" 
                  className="text-slate-400 hover:text-white transition-all duration-300 transform hover:scale-125"
                  title="Send Email"
                >
                  <i className="fas fa-envelope text-xl"></i>
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default CityDataDashboard;
