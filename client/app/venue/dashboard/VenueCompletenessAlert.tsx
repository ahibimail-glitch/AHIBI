"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  ChevronRight,
  CheckCircle2,
  X
} from "lucide-react";
import { useState } from "react";
import { checkVenueCompleteness, MissingField } from "@/utils/venueValidation";

interface VenueCompletenessAlertProps {
  venueData: any;
  onNavigateToSection: (section: string) => void;
}

export default function VenueCompletenessAlert({ 
  venueData, 
  onNavigateToSection 
}: VenueCompletenessAlertProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const completeness = checkVenueCompleteness(venueData);

  // Debug logging
  console.log('Venue Data for validation:', {
    description: venueData?.description,
    address: venueData?.address,
    pricing: venueData?.pricing,
    capacity: venueData?.capacity,
    capacityDetails: venueData?.capacityDetails,
    venueClassification: venueData?.venueClassification
  });
  console.log('Completeness result:', completeness);

  // Don't show if venue is complete
  if (completeness.isComplete && completeness.recommendedMissing.length === 0) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle2 className="h-5 w-5 text-green-600" />
        <AlertTitle className="text-green-900">Profile Complete!</AlertTitle>
        <AlertDescription className="text-green-700">
          Your venue profile is 100% complete and ready to receive bookings.
        </AlertDescription>
      </Alert>
    );
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'important':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case 'recommended':
        return <Info className="h-4 w-4 text-blue-600" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'important':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'recommended':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const renderMissingFieldsList = (fields: MissingField[], title: string, severity: string) => {
    if (fields.length === 0) return null;

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {getSeverityIcon(severity)}
          <h4 className="font-semibold text-sm">{title}</h4>
          <Badge variant="outline" className="ml-auto">
            {fields.length} {fields.length === 1 ? 'field' : 'fields'}
          </Badge>
        </div>
        <div className="space-y-1 pl-6">
          {fields.map((field, index) => (
            <div 
              key={index}
              className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{field.fieldLabel}</p>
                <p className="text-xs text-gray-500">{field.sectionLabel}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onNavigateToSection(field.section)}
                className="ml-2"
              >
                Fill Now
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className={`border-2 ${
      completeness.criticalMissing.length > 0 
        ? 'border-red-300 bg-red-50/50' 
        : completeness.importantMissing.length > 0
        ? 'border-orange-300 bg-orange-50/50'
        : 'border-blue-300 bg-blue-50/50'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              {completeness.criticalMissing.length > 0 ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span className="text-red-900">Action Required: Complete Your Profile</span>
                </>
              ) : completeness.importantMissing.length > 0 ? (
                <>
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <span className="text-orange-900">Improve Your Listing</span>
                </>
              ) : (
                <>
                  <Info className="h-5 w-5 text-blue-600" />
                  <span className="text-blue-900">Enhance Your Profile</span>
                </>
              )}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {completeness.criticalMissing.length > 0 
                ? 'Complete critical fields to activate your venue listing and start receiving bookings.'
                : completeness.importantMissing.length > 0
                ? 'Add important details to improve your venue visibility and attract more customers.'
                : 'Add recommended details to make your venue stand out and provide better information to customers.'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-2"
          >
            {isExpanded ? <X className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Profile Completion</span>
            <span className="text-sm font-bold text-gray-900">{completeness.completionPercentage}%</span>
          </div>
          <Progress 
            value={completeness.completionPercentage} 
            className="h-2"
          />
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Critical Missing Fields */}
          {renderMissingFieldsList(
            completeness.criticalMissing,
            'Critical Fields (Required)',
            'critical'
          )}

          {/* Important Missing Fields */}
          {renderMissingFieldsList(
            completeness.importantMissing,
            'Important Fields (Highly Recommended)',
            'important'
          )}

          {/* Recommended Missing Fields */}
          {renderMissingFieldsList(
            completeness.recommendedMissing,
            'Recommended Fields (Optional)',
            'recommended'
          )}

          {/* Summary Actions */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {completeness.missingFields.length} {completeness.missingFields.length === 1 ? 'field' : 'fields'} remaining
              </p>
              <div className="flex gap-2">
                {completeness.criticalMissing.length > 0 && (
                  <Button
                    size="sm"
                    variant="default"
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => onNavigateToSection(completeness.criticalMissing[0].section)}
                  >
                    Complete Critical Fields
                  </Button>
                )}
                {completeness.criticalMissing.length === 0 && completeness.importantMissing.length > 0 && (
                  <Button
                    size="sm"
                    variant="default"
                    className="bg-orange-600 hover:bg-orange-700"
                    onClick={() => onNavigateToSection(completeness.importantMissing[0].section)}
                  >
                    Add Important Details
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
