// components/EducationalWeatherImages.js - Fixed exports
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, ExternalLink, BookOpen, Zap } from 'lucide-react';

// Educational Image Gallery Component
const EducationalImageGallery = ({ images, topic, isEducational }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');

  if (!images || Object.keys(images).length === 0) return null;

  // Flatten all images into a single array with category info
  const allImages = [];
  Object.entries(images).forEach(([category, categoryImages]) => {
    if (Array.isArray(categoryImages)) {
      categoryImages.forEach(image => {
        allImages.push({
          ...image,
          category,
          categoryLabel: getCategoryLabel(category)
        });
      });
    }
  });

  if (allImages.length === 0) return null;

  // Filter images based on selected category
  const filteredImages = selectedCategory === 'all' 
    ? allImages 
    : allImages.filter(img => img.category === selectedCategory);

  const currentImage = filteredImages[currentImageIndex] || filteredImages[0];
  
  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % filteredImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + filteredImages.length) % filteredImages.length);
  };

  const categories = [...new Set(allImages.map(img => img.category))];

  return (
    <div style={{ 
      marginTop: '16px', 
      background: 'linear-gradient(to bottom right, #eff6ff, #e0e7ff)',
      borderRadius: '12px', 
      border: '1px solid #bfdbfe', 
      overflow: 'hidden' 
    }}>
      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(to right, #2563eb, #4f46e5)', 
        color: 'white', 
        padding: '16px' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen style={{ width: '20px', height: '20px' }} />
            <h3 style={{ fontWeight: '600', margin: 0 }}>
              {isEducational ? 'Weather Education' : 'Weather Images'}
            </h3>
            {topic && (
              <span style={{ 
                backgroundColor: 'rgba(255,255,255,0.2)', 
                fontSize: '12px', 
                padding: '4px 8px', 
                borderRadius: '4px' 
              }}>
                {formatTopicName(topic)}
              </span>
            )}
          </div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>
            {currentImageIndex + 1} of {filteredImages.length}
          </div>
        </div>

        {/* Category Filters */}
        {categories.length > 1 && (
          <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setCurrentImageIndex(0);
              }}
              style={{
                padding: '4px 12px',
                fontSize: '12px',
                borderRadius: '20px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                backgroundColor: selectedCategory === 'all' ? 'white' : 'rgba(255,255,255,0.2)',
                color: selectedCategory === 'all' ? '#2563eb' : 'white'
              }}
            >
              All ({allImages.length})
            </button>
            {categories.map(category => {
              const count = allImages.filter(img => img.category === category).length;
              return (
                <button
                  key={category}
                  onClick={() => {
                    setSelectedCategory(category);
                    setCurrentImageIndex(0);
                  }}
                  style={{
                    padding: '4px 12px',
                    fontSize: '12px',
                    borderRadius: '20px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    backgroundColor: selectedCategory === category ? 'white' : 'rgba(255,255,255,0.2)',
                    color: selectedCategory === category ? '#2563eb' : 'white'
                  }}
                >
                  {getCategoryLabel(category)} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Image Display */}
      <div style={{ position: 'relative' }}>
        <div style={{ 
          aspectRatio: '16/9', 
          backgroundColor: '#f3f4f6', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          position: 'relative', 
          overflow: 'hidden' 
        }}>
          {currentImage ? (
            <>
              <img
                src={currentImage.url}
                alt={currentImage.description || 'Weather educational image'}
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '100%', 
                  objectFit: 'contain' 
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              {/* Fallback for broken images */}
              <div style={{ 
                position: 'absolute', 
                inset: 0, 
                backgroundColor: '#e5e7eb', 
                display: 'none', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: '#6b7280',
                flexDirection: 'column'
              }}>
                <Eye style={{ width: '32px', height: '32px', marginBottom: '8px', opacity: 0.5 }} />
                <p style={{ fontSize: '14px', margin: 0 }}>Image unavailable</p>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', color: '#6b7280' }}>
              <Eye style={{ width: '32px', height: '32px', margin: '0 auto 8px', opacity: 0.5 }} />
              <p style={{ margin: 0 }}>No images available</p>
            </div>
          )}

          {/* Navigation arrows */}
          {filteredImages.length > 1 && (
            <>
              <button
                onClick={prevImage}
                style={{
                  position: 'absolute',
                  left: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  color: 'white',
                  padding: '8px',
                  borderRadius: '50%',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(0,0,0,0.7)'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'rgba(0,0,0,0.5)'}
              >
                <ChevronLeft style={{ width: '20px', height: '20px' }} />
              </button>
              <button
                onClick={nextImage}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  color: 'white',
                  padding: '8px',
                  borderRadius: '50%',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(0,0,0,0.7)'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'rgba(0,0,0,0.5)'}
              >
                <ChevronRight style={{ width: '20px', height: '20px' }} />
              </button>
            </>
          )}

          {/* Image type indicator */}
          <div style={{ position: 'absolute', top: '8px', left: '8px' }}>
            <span style={{ 
              backgroundColor: 'rgba(0,0,0,0.7)', 
              color: 'white', 
              fontSize: '12px', 
              padding: '4px 8px', 
              borderRadius: '4px' 
            }}>
              {getImageTypeIcon(currentImage?.type)} {currentImage?.categoryLabel}
            </span>
          </div>
        </div>

        {/* Image Information */}
        {currentImage && (
          <div style={{ padding: '16px', backgroundColor: 'white', borderTop: '1px solid #bfdbfe' }}>
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontWeight: '500', color: '#111827', margin: '0 0 8px 0' }}>
                {currentImage.description || 'Weather Image'}
              </h4>
              
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                fontSize: '14px', 
                color: '#6b7280' 
              }}>
                <span>Source: {currentImage.source || 'Unknown'}</span>
                {currentImage.station && (
                  <span>Station: {currentImage.station}</span>
                )}
              </div>

              {/* Educational explanation */}
              {isEducational && currentImage.category === 'educational' && (
                <div style={{ 
                  marginTop: '12px', 
                  padding: '12px', 
                  backgroundColor: '#eff6ff', 
                  borderRadius: '8px', 
                  border: '1px solid #bfdbfe' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <Zap style={{ width: '16px', height: '16px', color: '#2563eb', marginTop: '2px', flexShrink: 0 }} />
                    <div style={{ fontSize: '14px', color: '#1e40af' }}>
                      {getEducationalExplanation(currentImage, topic)}
                    </div>
                  </div>
                </div>
              )}

              {/* External link if available */}
              {currentImage.externalUrl && (
                <a
                  href={currentImage.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    fontSize: '14px', 
                    color: '#2563eb', 
                    textDecoration: 'none',
                    marginTop: '8px'
                  }}
                >
                  <ExternalLink style={{ width: '16px', height: '16px' }} />
                  <span>View full size</span>
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Thumbnail navigation for multiple images */}
      {filteredImages.length > 1 && (
        <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderTop: '1px solid #bfdbfe' }}>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
            {filteredImages.map((image, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                style={{
                  flexShrink: 0,
                  width: '80px',
                  height: '64px',
                  borderRadius: '8px',
                  border: `2px solid ${index === currentImageIndex ? '#2563eb' : '#d1d5db'}`,
                  overflow: 'hidden',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                  boxShadow: index === currentImageIndex ? '0 0 0 2px #bfdbfe' : 'none'
                }}
              >
                <img
                  src={image.url}
                  alt={`Thumbnail ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.style.backgroundColor = '#e5e7eb';
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Radar Image Component
const RadarImageDisplay = ({ radarImages, location }) => {
  const [currentRadar, setCurrentRadar] = useState(0);

  if (!radarImages || radarImages.length === 0) return null;

  return (
    <div style={{ 
      marginTop: '16px', 
      backgroundColor: 'white', 
      borderRadius: '12px', 
      border: '1px solid #e5e7eb', 
      overflow: 'hidden' 
    }}>
      <div style={{ 
        background: 'linear-gradient(to right, #059669, #2563eb)', 
        color: 'white', 
        padding: '12px' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '8px', 
              height: '8px', 
              backgroundColor: '#10b981', 
              borderRadius: '50%', 
              animation: 'pulse 1.5s ease-in-out infinite' 
            }}></div>
            <h3 style={{ fontWeight: '600', margin: 0 }}>Live Radar</h3>
            {location && (
              <span style={{ fontSize: '12px', opacity: 0.9 }}>
                {location.name || `${location.lat?.toFixed(2)}, ${location.lon?.toFixed(2)}`}
              </span>
            )}
          </div>
          {radarImages.length > 1 && (
            <div style={{ display: 'flex', gap: '4px' }}>
              {radarImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentRadar(index)}
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    backgroundColor: index === currentRadar ? 'white' : 'rgba(255,255,255,0.5)'
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ 
        aspectRatio: '1/1', 
        backgroundColor: '#f3f4f6', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        position: 'relative' 
      }}>
        {radarImages[currentRadar] && (
          <img
            src={radarImages[currentRadar].url}
            alt={radarImages[currentRadar].description}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        )}
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          backgroundColor: '#e5e7eb', 
          display: 'none', 
          alignItems: 'center', 
          justifyContent: 'center', 
          color: '#6b7280',
          flexDirection: 'column'
        }}>
          <Eye style={{ width: '32px', height: '32px', marginBottom: '8px', opacity: 0.5 }} />
          <p style={{ fontSize: '14px', margin: 0 }}>Radar unavailable</p>
        </div>
      </div>

      <div style={{ padding: '12px', backgroundColor: '#f9fafb', fontSize: '14px', color: '#6b7280' }}>
        <p style={{ margin: '0 0 4px 0' }}>{radarImages[currentRadar]?.description}</p>
        <p style={{ fontSize: '12px', margin: 0 }}>
          Source: {radarImages[currentRadar]?.source}
          {radarImages[currentRadar]?.station && ` • Station: ${radarImages[currentRadar].station}`}
        </p>
      </div>
    </div>
  );
};

// Helper functions
function getCategoryLabel(category) {
  const labels = {
    educational: 'Educational',
    radar: 'Radar',
    satellite: 'Satellite',
    fieldPhotos: 'Photos',
    diagrams: 'Diagrams',
    weatherScene: 'AI Scene',
    forecastChart: 'Forecast'
  };
  return labels[category] || category;
}

function formatTopicName(topic) {
  const names = {
    tornado: 'Tornadoes',
    hurricane: 'Hurricanes',
    radar_reading: 'Radar Reading',
    thunderstorm: 'Thunderstorms',
    winter_weather: 'Winter Weather',
    general: 'Weather Education'
  };
  return names[topic] || topic.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function getImageTypeIcon(type) {
  const icons = {
    radar_reflectivity: '📡',
    radar_current: '📡',
    satellite_visible: '🛰️',
    satellite_infrared: '🛰️',
    educational: '📚',
    field_photo: '📸',
    diagram: '📊',
    weatherScene: '🎨',
    forecastChart: '📈'
  };
  return icons[type] || '🌤️';
}

function getEducationalExplanation(image, topic) {
  const explanations = {
    tornado: {
      hook_echo: "This hook echo pattern on radar indicates rotation in a thunderstorm and possible tornado formation. The 'hook' shape shows where precipitation is being pulled around the mesocyclone.",
      velocity_couplet: "This velocity radar image shows winds moving toward and away from the radar in close proximity, indicating rotation that could produce a tornado.",
      debris_ball: "The circular area of high reflectivity near the hook echo indicates debris being lofted by a tornado, confirming tornado occurrence."
    },
    radar_reading: {
      reflectivity: "Radar reflectivity shows precipitation intensity. Green indicates light rain, yellow/orange shows moderate to heavy rain, and red indicates very heavy precipitation or hail.",
      velocity: "Velocity radar shows wind movement. Green areas show winds moving toward the radar, red shows winds moving away. Adjacent areas of different colors indicate rotation.",
      correlation_coefficient: "This product helps distinguish between precipitation types and can identify debris signatures during tornadoes."
    },
    hurricane: {
      eye: "The clear center of the hurricane where winds are calm and skies are often clear. The eye forms due to the balance between centrifugal force and pressure gradient.",
      eyewall: "The ring of intense thunderstorms around the eye where the strongest winds occur. This is the most dangerous part of the hurricane.",
      rainbands: "Spiral bands of thunderstorms that extend outward from the eyewall, producing heavy rain and gusty winds."
    }
  };

  // Try to match image description or type to explanation
  if (explanations[topic]) {
    for (const [key, explanation] of Object.entries(explanations[topic])) {
      if (image.description?.toLowerCase().includes(key) || image.type?.includes(key)) {
        return explanation;
      }
    }
  }

  // Default educational explanation
  return `This ${getCategoryLabel(image.category).toLowerCase()} helps illustrate weather patterns and phenomena for educational purposes.`;
}

// Export components properly
export { EducationalImageGallery, RadarImageDisplay };
export default { EducationalImageGallery, RadarImageDisplay };