'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface TermsData {
  [category: string]: {
    heading: string;
    content: string;
    lastUpdated: string;
  };
}

interface CategoryConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

const categories: CategoryConfig[] = [
  {
    id: 'organizer',
    name: 'Organizer',
    icon: '🎪',
    color: 'bg-blue-500',
    description: 'Terms and conditions for event organizers'
  },
  {
    id: 'venue',
    name: 'Venue',
    icon: '🏛️',
    color: 'bg-purple-500',
    description: 'Terms and conditions for venue partners'
  },
  {
    id: 'artist',
    name: 'Artist',
    icon: '🎨',
    color: 'bg-pink-500',
    description: 'Terms and conditions for artists and performers'
  },
  {
    id: 'sports',
    name: 'Sports',
    icon: '⚽',
    color: 'bg-green-500',
    description: 'Terms and conditions for sports events'
  }
];

const TermsManager: React.FC = () => {
  const [termsData, setTermsData] = useState<TermsData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('organizer');
  const [formData, setFormData] = useState<{ [key: string]: { heading: string; content: string } }>({});

  useEffect(() => {
    fetchTerms();
  }, []);

  useEffect(() => {
    // Initialize form data when terms data is loaded
    const initialFormData: { [key: string]: { heading: string; content: string } } = {};
    categories.forEach(category => {
      if (termsData[category.id]) {
        initialFormData[category.id] = {
          heading: termsData[category.id].heading,
          content: termsData[category.id].content
        };
      }
    });
    setFormData(initialFormData);
  }, [termsData]);

  const fetchTerms = async () => {
    try {
      const response = await fetch('/api/admin/terms', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch terms and conditions');
      }

      const result = await response.json();
      setTermsData(result.data);
    } catch (error) {
      console.error('Error fetching terms:', error);
      toast.error('Failed to load terms and conditions');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (category: string, field: 'heading' | 'content', value: string) => {
    setFormData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  const handleSaveCategory = async (category: string) => {
    if (!formData[category]?.heading.trim() || !formData[category]?.content.trim()) {
      toast.error('Heading and content are required');
      return;
    }

    setSaving(category);
    try {
      const response = await fetch(`/api/admin/terms/${category}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(formData[category])
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update terms');
      }

      const result = await response.json();
      toast.success(result.message);
      
      // Update local state with new data
      setTermsData(prev => ({
        ...prev,
        [category]: result.data
      }));
    } catch (error) {
      console.error('Error saving terms:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update terms');
    } finally {
      setSaving(null);
    }
  };

  const handleSaveAll = async () => {
    // Validate all categories
    const validCategories = categories.filter(category => 
      formData[category.id]?.heading.trim() && formData[category.id]?.content.trim()
    );

    if (validCategories.length === 0) {
      toast.error('At least one category must have valid heading and content');
      return;
    }

    setSaving('all');
    try {
      const termsToUpdate: { [key: string]: { heading: string; content: string } } = {};
      validCategories.forEach(category => {
        termsToUpdate[category.id] = formData[category.id];
      });

      const response = await fetch('/api/admin/terms', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ terms: termsToUpdate })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update terms');
      }

      const result = await response.json();
      toast.success(result.message);
      
      // Update local state with new data
      setTermsData(result.data);
    } catch (error) {
      console.error('Error saving all terms:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update terms');
    } finally {
      setSaving(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Terms & Conditions</h1>
          <p className="text-gray-600 mt-2">Manage terms and conditions for different user categories</p>
        </div>
        <Button onClick={handleSaveAll} disabled={saving === 'all'} className="bg-blue-600 hover:bg-blue-700">
          {saving === 'all' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving All...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save All Changes
            </>
          )}
        </Button>
      </div>

      {/* Category Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {categories.map(category => {
          const hasContent = termsData[category.id]?.content?.length > 50;
          const lastUpdated = termsData[category.id]?.lastUpdated;
          
          return (
            <Card key={category.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 ${category.color} rounded-lg flex items-center justify-center text-white text-xl`}>
                    {category.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{category.name}</h3>
                    <p className="text-sm text-gray-600">{category.description}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      {hasContent ? (
                        <Badge variant="secondary" className="text-green-600">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Configured
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-orange-600">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Not Set
                        </Badge>
                      )}
                    </div>
                    {lastUpdated && (
                      <p className="text-xs text-gray-500 mt-1">
                        Updated: {formatDate(lastUpdated)}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Terms Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Edit Terms & Conditions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              {categories.map(category => (
                <TabsTrigger key={category.id} value={category.id} className="flex items-center space-x-2">
                  <span>{category.icon}</span>
                  <span>{category.name}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map(category => (
              <TabsContent key={category.id} value={category.id} className="space-y-4 mt-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor={`${category.id}-heading`} className="text-sm font-medium text-gray-700">
                      Heading
                    </Label>
                    <Input
                      id={`${category.id}-heading`}
                      value={formData[category.id]?.heading || ''}
                      onChange={(e) => handleInputChange(category.id, 'heading', e.target.value)}
                      placeholder={`Enter ${category.name} terms heading...`}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`${category.id}-content`} className="text-sm font-medium text-gray-700">
                      Content
                    </Label>
                    <Textarea
                      id={`${category.id}-content`}
                      value={formData[category.id]?.content || ''}
                      onChange={(e) => handleInputChange(category.id, 'content', e.target.value)}
                      placeholder={`Enter ${category.name} terms and conditions content...`}
                      rows={12}
                      className="mt-1 resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Character count: {formData[category.id]?.content?.length || 0}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-gray-500">
                      {termsData[category.id]?.lastUpdated && (
                        <span>Last updated: {formatDate(termsData[category.id].lastUpdated)}</span>
                      )}
                    </div>
                    <Button 
                      onClick={() => handleSaveCategory(category.id)}
                      disabled={saving === category.id || !formData[category.id]?.heading.trim() || !formData[category.id]?.content.trim()}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {saving === category.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save {category.name} Terms
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default TermsManager;
