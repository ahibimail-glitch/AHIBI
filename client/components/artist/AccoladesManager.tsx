"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Award, Plus, Edit, Trash2, Calendar, Building } from "lucide-react";

interface Accolade {
  _id: string;
  title: string;
  description: string;
  year: number;
  organization: string;
  certificate?: string;
}

interface AccoladesManagerProps {
  accolades: Accolade[];
  onUpdate: () => void;
  embedded?: boolean;
}

export default function AccoladesManager({ accolades, onUpdate, embedded = false }: AccoladesManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    year: '',
    organization: '',
    certificate: ''
  });

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      year: '',
      organization: '',
      certificate: ''
    });
  };

  const handleAdd = async () => {
    try {
      const token = localStorage.getItem('artist_token');
      const response = await fetch('/api/artist/accolades', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...form,
          year: form.year ? parseInt(form.year) : undefined,
        })
      });

      if (response.ok) {
        resetForm();
        setIsAdding(false);
        onUpdate();
      }
    } catch (error) {
      console.error('Error adding accolade:', error);
    }
  };

  const handleEdit = async (accoladeId: string) => {
    try {
      const token = localStorage.getItem('artist_token');
      const response = await fetch(`/api/artist/accolades/${accoladeId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...form,
          year: form.year ? parseInt(form.year) : undefined,
        })
      });

      if (response.ok) {
        resetForm();
        setEditingId(null);
        onUpdate();
      }
    } catch (error) {
      console.error('Error updating accolade:', error);
    }
  };

  const handleRemove = async (accoladeId: string) => {
    if (!confirm('Are you sure you want to remove this accolade?')) return;

    try {
      const token = localStorage.getItem('artist_token');
      const response = await fetch(`/api/artist/accolades/${accoladeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error removing accolade:', error);
    }
  };

  const startEdit = (accolade: Accolade) => {
    setForm({
      title: accolade.title,
      description: accolade.description,
      year: accolade.year?.toString() ?? '',
      organization: accolade.organization,
      certificate: accolade.certificate || ''
    });
    setEditingId(accolade._id);
  };

  const accoladesList = (
    <div className="space-y-4">
      {accolades.length > 0 ? (
        accolades.map((accolade) => (
          <div key={accolade._id} className="border rounded-lg p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg flex items-center">
                  <Award className="h-5 w-5 mr-2 text-yellow-500" />
                  {accolade.title}
                </h3>
                {accolade.description && (
                  <p className="text-muted-foreground mt-1">{accolade.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {accolade.year}
                  </span>
                  {accolade.organization && (
                    <span className="flex items-center">
                      <Building className="h-4 w-4 mr-1" />
                      {accolade.organization}
                    </span>
                  )}
                </div>
                {accolade.certificate && (
                  <div className="mt-2">
                    <a
                      href={accolade.certificate}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      View Certificate
                    </a>
                  </div>
                )}
              </div>
              <div className="flex gap-2 sm:flex-col sm:items-end shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 sm:flex-none"
                  onClick={() => startEdit(accolade)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 sm:flex-none"
                  onClick={() => handleRemove(accolade._id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Award className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No accolades added yet</p>
          <p className="text-sm">Add your awards and recognitions to showcase your achievements</p>
        </div>
      )}
    </div>
  );

  const editDialog = (
      <Dialog open={!!editingId} onOpenChange={() => setEditingId(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Accolade</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Award or recognition title"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description of the accolade..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-year">Year</Label>
                <Input
                  id="edit-year"
                  type="number"
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                  placeholder="e.g. 2024"
                />
              </div>
              <div>
                <Label htmlFor="edit-organization">Organization</Label>
                <Input
                  id="edit-organization"
                  value={form.organization}
                  onChange={(e) => setForm({ ...form, organization: e.target.value })}
                  placeholder="Awarding organization"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-certificate">Certificate URL (optional)</Label>
              <Input
                id="edit-certificate"
                value={form.certificate}
                onChange={(e) => setForm({ ...form, certificate: e.target.value })}
                placeholder="https://example.com/certificate.jpg"
              />
            </div>
            <Button onClick={() => editingId && handleEdit(editingId)} className="w-full">
              Update Accolade
            </Button>
          </div>
        </DialogContent>
    </Dialog>
  );

  const titleBlock = (
    <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
      <div>
        {embedded ? (
          <>
            <h3 className="text-base font-semibold flex items-center">
              <Award className="h-5 w-5 mr-2 text-yellow-500" />
              Awards & Achievements ({accolades.length})
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Showcase recognitions inside your EPK to build credibility with organizers.
            </p>
          </>
        ) : (
          <CardTitle className="flex items-center">
            <Award className="h-5 w-5 mr-2" />
            Accolades & Awards ({accolades.length})
          </CardTitle>
        )}
      </div>
      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogTrigger asChild>
          <Button size="sm" className={embedded ? "w-full sm:w-auto" : ""}>
            <Plus className="h-4 w-4 mr-1" />
            Add Accolade
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Accolade</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Award or recognition title"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description of the accolade..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                  placeholder="e.g. 2024"
                />
              </div>
              <div>
                <Label htmlFor="organization">Organization</Label>
                <Input
                  id="organization"
                  value={form.organization}
                  onChange={(e) => setForm({ ...form, organization: e.target.value })}
                  placeholder="Awarding organization"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="certificate">Certificate URL (optional)</Label>
              <Input
                id="certificate"
                value={form.certificate}
                onChange={(e) => setForm({ ...form, certificate: e.target.value })}
                placeholder="https://example.com/certificate.jpg"
              />
            </div>
            <Button onClick={handleAdd} className="w-full">
              Add Accolade
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (embedded) {
    return (
      <div className="space-y-4">
        {titleBlock}
        {accoladesList}
        {editDialog}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>{titleBlock}</CardHeader>
      <CardContent>{accoladesList}</CardContent>
      {editDialog}
    </Card>
  );
}
