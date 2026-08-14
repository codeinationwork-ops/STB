export interface LocationResult {
  success: boolean;
  latitude?: number;
  longitude?: number;
  googleMapUrl: string;
  addressText: string;
  source: 'gps_high' | 'gps_low' | 'ip' | 'city_search';
  message: string;
}

export async function detectShopLocation(
  shopName: string = 'Tailor Shop',
  city: string = 'New Delhi'
): Promise<LocationResult> {
  const tryBrowserGeo = (highAccuracy: boolean, timeoutMs: number): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        return reject(new Error('Geolocation unsupported'));
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: highAccuracy, timeout: timeoutMs, maximumAge: 300000 }
      );
    });
  };

  // 1. Fast Browser Geolocation Attempt
  try {
    const coords = await tryBrowserGeo(false, 4000);
    const mapUrl = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
    const address = `GPS: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
    return {
      success: true,
      latitude: coords.lat,
      longitude: coords.lng,
      googleMapUrl: mapUrl,
      addressText: address,
      source: 'gps_low',
      message: `📍 GPS Coordinates Stored: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`,
    };
  } catch (e) {
    console.warn('Low accuracy browser GPS failed:', e);
  }

  // 2. High Accuracy Geolocation Attempt
  try {
    const coords = await tryBrowserGeo(true, 6000);
    const mapUrl = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
    const address = `GPS: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
    return {
      success: true,
      latitude: coords.lat,
      longitude: coords.lng,
      googleMapUrl: mapUrl,
      addressText: address,
      source: 'gps_high',
      message: `📍 Precise GPS Coordinates Stored: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`,
    };
  } catch (e) {
    console.warn('High accuracy browser GPS failed:', e);
  }

  // 3. Fallback to Network/IP Geolocation API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data && data.latitude && data.longitude) {
        const lat = data.latitude;
        const lng = data.longitude;
        const detectedCity = data.city || city;
        const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
        const address = `${detectedCity} (GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        return {
          success: true,
          latitude: lat,
          longitude: lng,
          googleMapUrl: mapUrl,
          addressText: address,
          source: 'ip',
          message: `🌐 Location detected via Network (${detectedCity}: ${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        };
      }
    }
  } catch (e) {
    console.warn('IP Geolocation failed:', e);
  }

  // 4. Fallback to Google Search Map Link for Shop & City
  const searchQuery = encodeURIComponent(`${shopName} ${city}`);
  const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${searchQuery}`;
  return {
    success: true,
    googleMapUrl: fallbackUrl,
    addressText: `${shopName}, ${city}`,
    source: 'city_search',
    message: `🗺️ Google Maps Location set for "${shopName}, ${city}"`,
  };
}
