"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, User, UserCircle, Award, Users, Link as LinkIcon, Layers, Calendar as CalendarIcon, ShieldCheck, CheckCircle2, XCircle, FileText } from "lucide-react";

interface NISRegistration {
  _id: string;
  registrationId: string;
  fullName: string;
  creatorName: string;
  email: string;
  dateOfBirth: string;
  gender: string;
  bio: string;
  nagalandResident: boolean;
  platforms: Array<{
    platform: string;
    handle: string;
    profileUrl: string;
    followerCount: number;
    isPrimary: boolean;
    engagementRate?: number;
  }>;
  totalFollowers: number;
  topContent: Array<{
    title: string;
    platform: string;
    url: string;
    type: string;
    views: number;
    likes: number;
    shares: number;
    comments: number;
  }>;
  analyticsFileUrl?: string;
  contentNiches: string[];
  awardCategory: string;
  campusName?: string;
  yearsActive: number;
  achievements: string;
  brandCollaborations: Array<{
    brandName: string;
    campaignTitle: string;
    year: string;
    type: string;
    description: string;
  }>;
  consents: {
    accuracy: boolean;
    terms: boolean;
    dataUsage: boolean;
    emailCopy: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

function formatNumber(num: number) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return (num || 0).toString();
}

function getCategoryColor(category: string) {
  const colors: { [key: string]: string } = {
    "Fashion & Lifestyle": "bg-pink-100 text-pink-800 border-pink-200",
    "Food & Travel": "bg-orange-100 text-orange-800 border-orange-200",
    "Tech & Gaming": "bg-blue-100 text-blue-800 border-blue-200",
    "Beauty & Wellness": "bg-purple-100 text-purple-800 border-purple-200",
    "Entertainment": "bg-yellow-100 text-yellow-800 border-yellow-200",
    Education: "bg-green-100 text-green-800 border-green-200",
    "Sports & Fitness": "bg-red-100 text-red-800 border-red-200",
    "Business & Finance": "bg-indigo-100 text-indigo-800 border-indigo-200",
  };
  return colors[category] || "bg-gray-100 text-gray-800 border-gray-200";
}

export default function NISRegistrationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string);
  const [data, setData] = useState<NISRegistration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOne = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/nis/registrations/${id}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || "Failed to load registration");
        setData(json.data);
      } catch (e: any) {
        setError(e?.message || "Failed to load registration");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchOne();
  }, [id]);

  const printPage = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="p-6">
        <p>Loading...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <p className="text-red-600">{error || "Registration not found"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 md:px-8 py-6">
      <div className="flex items-center justify-between mb-6 print:hidden">
     
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Registration Details - {data.registrationId}</h1>
    
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-white/70 backdrop-blur-sm border border-blue-200 shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-blue-700">
              <User className="h-4 w-4" />
              <p className="text-sm">Full Name</p>
            </div>
            <p className="text-lg font-semibold break-words text-gray-900">{data.fullName}</p>
          </CardContent>
        </Card>
        <Card className="bg-white/70 backdrop-blur-sm border border-purple-200 shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-purple-700">
              <UserCircle className="h-4 w-4" />
              <p className="text-sm">Creator Name</p>
            </div>
            <p className="text-lg font-semibold break-words text-gray-900">{data.creatorName}</p>
          </CardContent>
        </Card>
        <Card className="bg-white/70 backdrop-blur-sm border border-amber-200 shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-amber-700">
              <Award className="h-4 w-4" />
              <p className="text-sm">Category</p>
            </div>
            <div className={`inline-flex items-center gap-2 px-3 py-1 mt-1 rounded-md border ${getCategoryColor(data.awardCategory)}`}>
              <Award className="h-4 w-4" />
              <span className="text-sm font-medium">{data.awardCategory}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Personal Information */}
      <Card className="mb-6 bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2"><FileText className="h-5 w-5 text-blue-600" /> Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium break-words">{data.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Date of Birth</p>
              <p className="font-medium">{data.dateOfBirth}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Gender</p>
              <p className="font-medium">{data.gender}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Nagaland Resident</p>
              <Badge variant={data.nagalandResident ? "default" : "secondary"}>
                {data.nagalandResident ? "Yes" : "No"}
              </Badge>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600">Bio</p>
            <p className="whitespace-pre-wrap break-words">{data.bio}</p>
          </div>
        </CardContent>
      </Card>

      {/* Social Media Presence */}
      <Card className="mb-6 bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2"><Users className="h-5 w-5 text-purple-600" /> Social Media Presence</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-3">
          <div>
            <p className="text-sm text-gray-600">Total Followers</p>
            <p className="text-2xl font-bold">{formatNumber(data.totalFollowers)}</p>
          </div>
          {data.platforms.map((p, i) => (
            <div key={i} className="border rounded-md p-3 bg-white/60">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold flex items-center gap-2"><Layers className="h-4 w-4 text-purple-600" /> {p.platform}</p>
                  <p className="text-sm text-gray-600">@{p.handle}</p>
                  <a href={p.profileUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline break-all inline-flex items-center gap-1">
                    <LinkIcon className="h-3 w-3" /> {p.profileUrl}
                  </a>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium">{formatNumber(p.followerCount)} followers</p>
                  {p.engagementRate ? (
                    <p className="text-gray-600">{p.engagementRate}% engagement</p>
                  ) : null}
                  {p.isPrimary ? <Badge className="mt-1">Primary</Badge> : null}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Content Portfolio */}
      <Card className="mb-6 bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2"><Layers className="h-5 w-5 text-emerald-600" /> Content Portfolio</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-3">
          {data.topContent.map((c, i) => (
            <div key={i} className="border rounded-md p-3 bg-white/60">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold">{c.title}</p>
                  <p className="text-sm text-gray-600">{c.platform} • {c.type}</p>
                  <a href={c.url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline break-all inline-flex items-center gap-1">
                    <LinkIcon className="h-3 w-3" /> {c.url}
                  </a>
                </div>
                <div className="text-right text-sm">
                  <p>{formatNumber(c.views)} views</p>
                  <p>{formatNumber(c.likes)} likes</p>
                  <p>{formatNumber(c.shares)} shares</p>
                  <p>{formatNumber(c.comments)} comments</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Category & Experience */}
      <Card className="mb-6 bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2"><Award className="h-5 w-5 text-amber-600" /> Category & Experience</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Content Niches</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {data.contentNiches.map((n, i) => (
                  <Badge key={i} variant="outline" className="whitespace-normal break-words">{n}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600">Award Category</p>
              <p className="font-medium break-words">{data.awardCategory}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Campus Name</p>
              <p className="font-medium break-words">{data.campusName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Years Active</p>
              <p className="font-medium">{data.yearsActive} years</p>
            </div>
          </div>
          {data.achievements ? (
            <div>
              <p className="text-sm text-gray-600">Achievements</p>
              <p className="font-medium whitespace-pre-wrap break-words">{data.achievements}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Brand Collaborations */}
      {data.brandCollaborations?.length ? (
        <Card className="mb-6 bg-white/70 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2"><Users className="h-5 w-5 text-fuchsia-600" /> Brand Collaborations</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            {data.brandCollaborations.map((b, i) => (
              <div key={i} className="border rounded-md p-3 bg-white/60">
                <p className="font-semibold">{b.brandName}</p>
                <p className="text-sm text-gray-600">{b.campaignTitle}</p>
                <p className="text-sm text-gray-500">{b.year} • {b.type}</p>
                {b.description ? (
                  <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap break-words">{b.description}</p>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {/* Consents */}
      {/* <Card className="mb-10 bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-green-600" /> Consents</CardTitle>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Accuracy</p>
            <div className="flex items-center gap-2">
              {data.consents.accuracy ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-gray-500" />}
              <Badge className={data.consents.accuracy ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>{data.consents.accuracy ? "Yes" : "No"}</Badge>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600">Terms</p>
            <div className="flex items-center gap-2">
              {data.consents.terms ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-gray-500" />}
              <Badge className={data.consents.terms ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>{data.consents.terms ? "Yes" : "No"}</Badge>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600">Data Usage</p>
            <div className="flex items-center gap-2">
              {data.consents.dataUsage ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-gray-500" />}
              <Badge className={data.consents.dataUsage ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>{data.consents.dataUsage ? "Yes" : "No"}</Badge>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600">Email Copy</p>
            <div className="flex items-center gap-2">
              {data.consents.emailCopy ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-gray-500" />}
              <Badge className={data.consents.emailCopy ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>{data.consents.emailCopy ? "Yes" : "No"}</Badge>
            </div>
          </div>
        </CardContent>
      </Card> */}
      </div>
    </div>
  );
}


