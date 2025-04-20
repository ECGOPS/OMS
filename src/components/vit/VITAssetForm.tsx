import { useState, useEffect, useRef, useCallback } from "react";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { VITAsset, VITStatus, VoltageLevel } from "@/lib/types";
import { Loader2, MapPin, Camera, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import Webcam from "react-webcam";

interface VITAssetFormProps {
  asset?: VITAsset;
  onSubmit: () => void;
  onCancel: () => void;
}

export function VITAssetForm({ asset, onSubmit, onCancel }: VITAssetFormProps) {
  const { regions, districts, addVITAsset, updateVITAsset } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const webcamRef = useRef<Webcam>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const [regionId, setRegionId] = useState<string>(asset?.regionId || "");
  const [districtId, setDistrictId] = useState<string>(asset?.districtId || "");
  const [voltageLevel, setVoltageLevel] = useState<VoltageLevel>(asset?.voltageLevel || "11KV");
  const [typeOfUnit, setTypeOfUnit] = useState(asset?.typeOfUnit || "");
  const [serialNumber, setSerialNumber] = useState(asset?.serialNumber || "");
  const [location, setLocation] = useState(asset?.location || "");
  const [gpsCoordinates, setGpsCoordinates] = useState(asset?.gpsCoordinates || "");
  const [status, setStatus] = useState<VITStatus>(asset?.status || "Operational");
  const [protection, setProtection] = useState(asset?.protection || "");
  const [photoUrl, setPhotoUrl] = useState(asset?.photoUrl || "");
  const [formData, setFormData] = useState<Partial<VITAsset>>({
    regionId: asset?.regionId || "",
    districtId: asset?.districtId || "",
    voltageLevel: asset?.voltageLevel || "11KV",
    typeOfUnit: asset?.typeOfUnit || "",
    serialNumber: asset?.serialNumber || "",
    location: asset?.location || "",
    gpsCoordinates: asset?.gpsCoordinates || "",
    status: asset?.status || "Operational",
    protection: asset?.protection || "",
    photoUrl: asset?.photoUrl || "",
    createdBy: user?.email || "unknown"
  });

  // Initialize region and district based on user's assigned values
  useEffect(() => {
    if (!asset && (user?.role === "district_engineer" || user?.role === "regional_engineer" || user?.role === "technician")) {
      // Find region ID based on user's assigned region name
      const userRegion = regions.find(r => r.name === user.region);
      if (userRegion) {
        setRegionId(userRegion.id);
        setFormData(prev => ({ ...prev, regionId: userRegion.id }));
        
        // For district engineer and technician, also set the district
        if ((user.role === "district_engineer" || user?.role === "technician") && user.district) {
          const userDistrict = districts.find(d => 
            d.regionId === userRegion.id && d.name === user.district
          );
          if (userDistrict) {
            setDistrictId(userDistrict.id);
            setFormData(prev => ({ ...prev, districtId: userDistrict.id }));
          }
        }
      }
    }
  }, [user, regions, districts, asset]);

  // Ensure district engineer's and technician's district is always set correctly
  useEffect(() => {
    if ((user?.role === "district_engineer" || user?.role === "technician") && user.district && !asset) {
      // Find the user's assigned district
      const userRegion = regions.find(r => r.name === user.region);
      if (userRegion) {
        const userDistrict = districts.find(d => 
          d.regionId === userRegion.id && d.name === user.district
        );
        if (userDistrict && userDistrict.id !== districtId) {
          setDistrictId(userDistrict.id);
          setFormData(prev => ({ ...prev, districtId: userDistrict.id }));
        }
      }
    }
  }, [user, regions, districts, districtId, asset]);

  // Filter regions and districts based on user role
  const filteredRegions = user?.role === "global_engineer"
    ? regions
    : regions.filter(r => user?.region ? r.name === user.region : true);
  
  const filteredDistricts = regionId
    ? districts.filter(d => {
        const region = regions.find(r => r.id === regionId);
        return region?.districts.some(rd => rd.id === d.id) && (
          user?.role === "district_engineer" || user?.role === "technician"
            ? user.district === d.name 
            : true
        );
      })
    : [];
  
  const handleGetLocation = () => {
    setIsGettingLocation(true);
    
    if (!navigator.geolocation) {
      setIsGettingLocation(false);
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const accuracy = position.coords.accuracy;
        
        setGpsCoordinates(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        setIsGettingLocation(false);
        toast.success("Location obtained successfully!");
        
        if (accuracy > 100) {
          toast.warning(`Location accuracy is ${Math.round(accuracy)} meters. Consider moving to an open area for better accuracy.`);
        }
      },
      (error) => {
        setIsGettingLocation(false);
        let errorMessage = "Could not get your location. ";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access was denied. Please check your browser settings:";
            toast.error(errorMessage, {
              duration: 6000,
              description: "1. Click the lock/info icon in your address bar\n2. Find 'Location' in site settings\n3. Allow access and refresh the page"
            });
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += "Location information is unavailable. Please check your GPS settings and ensure you're not in airplane mode.";
            toast.error(errorMessage);
            break;
          case error.TIMEOUT:
            errorMessage += "Location request timed out. Please check your internet connection and try again.";
            toast.error(errorMessage);
            break;
          default:
            errorMessage += "Please try again or enter coordinates manually.";
            toast.error(errorMessage);
        }
      },
      options
    );
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!regionId || !districtId || !serialNumber || !typeOfUnit || !location || !voltageLevel) {
      alert("Please fill all required fields");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const assetData = {
        regionId,
        districtId,
        voltageLevel,
        typeOfUnit,
        serialNumber,
        location,
        gpsCoordinates,
        status,
        protection,
        photoUrl,
        createdBy: user?.email || "unknown"
      };
      
      if (asset) {
        // Update existing asset
        updateVITAsset(asset.id, assetData);
      } else {
        // Add new asset
        addVITAsset(assetData);
      }
      
      onSubmit();
    } catch (error) {
      console.error("Error submitting VIT asset:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Detect if user is on mobile device
  useEffect(() => {
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      setIsMobile(mobile);
    };
    checkMobile();
  }, []);

  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: isMobile ? "environment" : "user"
  };

  const handleCameraError = useCallback((error: any) => {
    console.error('Camera Error:', error);
    setCameraError(error.message || 'Failed to access camera');
    toast.error(
      'Camera access failed. Please check permissions and try again.',
      {
        duration: 5000,
        description: error.message || "Make sure your camera is not being used by another application"
      }
    );
  }, []);

  const captureImage = useCallback(() => {
    if (webcamRef.current) {
      try {
        const imageSrc = webcamRef.current.getScreenshot();
        if (imageSrc) {
          setCapturedImage(imageSrc);
          setPhotoUrl(imageSrc);
          setIsCapturing(false);
          toast.success('Photo captured successfully!');
        } else {
          toast.error('Failed to capture image. Please try again.');
        }
      } catch (error) {
        console.error('Error capturing image:', error);
        toast.error('Failed to capture image. Please try again.');
      }
    }
  }, []);

  // Add explicit guards in the region and district change handlers
  const handleRegionChange = (value: string) => {
    // District engineers cannot change their region
    if (user?.role === "district_engineer") {
      return;
    }
    setRegionId(value);
    setFormData(prev => ({ ...prev, regionId: value }));
    // Reset district when region changes
    setDistrictId("");
    setFormData(prev => ({ ...prev, districtId: "" }));
  };

  const handleDistrictChange = (value: string) => {
    // District engineers cannot change their district
    if (user?.role === "district_engineer") {
      return;
    }
    setDistrictId(value);
    setFormData(prev => ({ ...prev, districtId: value }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setCapturedImage(base64String);
        setPhotoUrl(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  // Update the Dialog component to ensure proper cleanup
  useEffect(() => {
    // Cleanup function to ensure camera is stopped when dialog is closed
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
        });
        streamRef.current = null;
      }
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{asset ? "Edit VIT Asset" : "Add New VIT Asset"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="region">Region *</Label>
              <Select 
                value={regionId} 
                onValueChange={handleRegionChange}
                disabled={user?.role === "district_engineer" || user?.role === "regional_engineer" || user?.role === "technician"}
                required
              >
                <SelectTrigger id="region">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {filteredRegions.map(region => (
                    <SelectItem key={region.id} value={region.id || "unknown-region"}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="district">District *</Label>
              <Select 
                value={districtId} 
                onValueChange={handleDistrictChange}
                disabled={user?.role === "district_engineer" || user?.role === "technician" || !regionId}
                required
              >
                <SelectTrigger id="district">
                  <SelectValue placeholder="Select district" />
                </SelectTrigger>
                <SelectContent>
                  {filteredDistricts.map(district => (
                    <SelectItem key={district.id} value={district.id || "unknown-district"}>
                      {district.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="voltageLevel">Voltage Level *</Label>
              <Select 
                value={voltageLevel} 
                onValueChange={(val) => setVoltageLevel(val as VoltageLevel)}
                required
              >
                <SelectTrigger id="voltageLevel">
                  <SelectValue placeholder="Select voltage level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="11KV">11KV</SelectItem>
                  <SelectItem value="33KV">33KV</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select 
                value={status} 
                onValueChange={(val) => setStatus(val as VITStatus)}
                required
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Operational">Operational</SelectItem>
                  <SelectItem value="Under Maintenance">Under Maintenance</SelectItem>
                  <SelectItem value="Faulty">Faulty</SelectItem>
                  <SelectItem value="Decommissioned">Decommissioned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="typeOfUnit">Type of Unit *</Label>
              <Input
                id="typeOfUnit"
                value={typeOfUnit}
                onChange={(e) => setTypeOfUnit(e.target.value)}
                placeholder="E.g., Ring Main Unit, Circuit Breaker"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="serialNumber">Serial Number *</Label>
              <Input
                id="serialNumber"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="E.g., RMU2023-001"
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="location">Location *</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="E.g., Main Street Substation"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="gpsCoordinates">GPS Coordinates</Label>
            <div className="flex gap-2">
              <Input
                id="gpsCoordinates"
                value={gpsCoordinates}
                onChange={(e) => setGpsCoordinates(e.target.value)}
                placeholder="Latitude, Longitude"
                className="flex-1"
              />
              <Button 
                type="button"
                variant="outline"
                onClick={handleGetLocation}
                disabled={isGettingLocation}
              >
                {isGettingLocation ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <MapPin className="h-4 w-4 mr-1" />
                )}
                Get Location
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="protection">Protection</Label>
            <Input
              id="protection"
              value={protection}
              onChange={(e) => setProtection(e.target.value)}
              placeholder="E.g., Overcurrent, Earth Fault"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Asset Photo</Label>
            <div className="flex flex-col gap-4">
              {capturedImage && (
                <div className="relative">
                  <img 
                    src={capturedImage} 
                    alt="Captured asset" 
                    className="w-full h-48 object-cover rounded-md"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setCapturedImage(null);
                      setPhotoUrl("");
                    }}
                  >
                    Remove
                  </Button>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCapturing(true)}
                  className="flex-1"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Take Photo
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Photo
                  <input
                    id="file-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </Button>
              </div>
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} onClick={handleSubmit}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {asset ? "Updating..." : "Adding..."}
            </>
          ) : (
            asset ? "Update Asset" : "Add Asset"
          )}
        </Button>
      </CardFooter>

      {/* Camera Dialog */}
      <Dialog open={isCapturing} onOpenChange={(open) => {
        if (!open) {
          setCameraError(null);
        }
        setIsCapturing(open);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Take Photo</DialogTitle>
            <DialogDescription>
              Take a photo of the VIT asset using your camera. Make sure the asset is clearly visible and well-lit.
            </DialogDescription>
            {cameraError && (
              <p className="text-sm text-red-500 mt-2">
                Error: {cameraError}
              </p>
            )}
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative aspect-video bg-black">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={videoConstraints}
                onUserMediaError={handleCameraError}
                className="w-full h-full rounded-md object-cover"
                mirrored={!isMobile}
                imageSmoothing={true}
              />
            </div>
            <div className="flex justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCapturing(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={captureImage}
                disabled={!!cameraError}
              >
                Capture
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
