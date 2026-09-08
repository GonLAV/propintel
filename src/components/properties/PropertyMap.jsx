import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MapPin, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PropertyMap({ property }) {
  const hasCoordinates = property.latitude && property.longitude;

  const openInGoogleMaps = () => {
    const address = encodeURIComponent(`${property.address}, ${property.city}, Israel`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
  };

  const openInWaze = () => {
    if (hasCoordinates) {
      window.open(`https://waze.com/ul?ll=${property.latitude},${property.longitude}&navigate=yes`, '_blank');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="w-4 h-4 text-indigo-600" />
          מיקום
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Google Maps Embed */}
        <div className="w-full h-80 rounded-lg overflow-hidden border border-slate-200">
          <iframe
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(
              `${property.address}, ${property.city}, Israel`
            )}`}
          />
        </div>

        {/* Address Info */}
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <p className="text-sm font-semibold text-slate-900 mb-1">{property.address}</p>
          <p className="text-sm text-slate-600">{property.city}</p>
          {property.neighborhood && (
            <p className="text-xs text-slate-500 mt-1">שכונה: {property.neighborhood}</p>
          )}
          {hasCoordinates && (
            <p className="text-xs text-slate-400 mt-2">
              {property.latitude.toFixed(6)}, {property.longitude.toFixed(6)}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={openInGoogleMaps}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1" />
            Google Maps
          </Button>
          <Button
            onClick={openInWaze}
            variant="outline"
            size="sm"
            className="w-full"
            disabled={!hasCoordinates}
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1" />
            Waze
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}