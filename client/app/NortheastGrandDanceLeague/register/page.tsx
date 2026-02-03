"use client"
import React, { useState, ChangeEvent, FormEvent } from 'react';
import { User, Mail, Phone, Calendar, MapPin, Users, Sparkles, Music, Award, X } from 'lucide-react';

export default function DanceRegistrationForm() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    dobDay: '',
    dobMonth: '',
    dobYear: '',
    address: '',
    city: '',
    zip: '',
    state: '',
    country: '',
    registrationType: 'solo',
    danceStyle: [] as string[],
    otherStyle: '',
    groupName: '',
    numDancers: '',
    groupDanceStyle: [] as string[],
    groupOtherStyle: '',
    agreed: false
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleStyleChange = (style: string, isGroup = false) => {
    const field = isGroup ? 'groupDanceStyle' : 'danceStyle';
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(style)
        ? prev[field].filter(s => s !== style)
        : [...prev[field], style]
    }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    alert('Registration submitted successfully!');
  };

  const danceStyles = ['Ballet', 'Hip Hop', 'Contemporary', 'Jazz', 'Tap'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 py-4 sm:py-8 lg:py-12 px-3 sm:px-4 lg:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Cover Image Section */}
        <div className="relative w-full h-48 sm:h-64 lg:h-80 rounded-2xl sm:rounded-3xl overflow-hidden mb-6 sm:mb-8 lg:mb-12 shadow-2xl">
          <img 
            src="/api/placeholder/1200/400" 
            alt="Northeast Grand Dance League" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent"></div>
          
          {/* Cover Image Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <div className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 bg-yellow-400/90 rounded-full mb-3 sm:mb-4">
              <Award className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-900" />
              <span className="text-xs sm:text-sm font-bold text-yellow-900 tracking-wider">SEASON 01 • OFFICIAL REGISTRATION</span>
              <Award className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-900" />
            </div>
            
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <Music className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-blue-400" />
              <h1 className="text-3xl sm:text-5xl lg:text-7xl font-bold text-white tracking-tight" 
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                Northeast
              </h1>
              <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-purple-400" />
            </div>
            
            <h2 className="text-lg sm:text-2xl lg:text-4xl font-light text-white tracking-[0.15em] sm:tracking-[0.25em] mb-2 sm:mb-3"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              GRAND DANCE LEAGUE
            </h2>
            
            <p className="text-blue-100 text-xs sm:text-sm lg:text-base max-w-2xl leading-relaxed">
              Join the most prestigious dance competition in the Northeast region
            </p>
          </div>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
          {/* Decorative gradient line */}
          <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
          
          {/* Form Title */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-4 sm:px-6 lg:px-10 py-5 sm:py-6 lg:py-8 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 bg-blue-100 rounded-xl">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Registration Form</h2>
                <p className="text-gray-600 text-xs sm:text-sm mt-0.5 sm:mt-1">Fill in your details to secure your spot</p>
              </div>
            </div>
          </div>

          {/* Personal Information Section */}
          <div className="p-4 sm:p-6 lg:p-10 space-y-5 sm:space-y-6 lg:space-y-8">
            <div className="flex items-center gap-2 sm:gap-3 pb-3 sm:pb-4 border-b border-gray-200">
              <div className="w-1 h-6 sm:h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Personal Information</h3>
            </div>

            <div className="grid gap-4 sm:gap-5">
              {/* Full Name */}
              <div>
                <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                  <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Full Name
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all outline-none text-sm sm:text-base"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                  <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all outline-none text-sm sm:text-base"
                  placeholder="your.email@example.com"
                  required
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                  <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all outline-none text-sm sm:text-base"
                  placeholder="(123) 456-7890"
                  required
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Date of Birth
                </label>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <input
                    type="text"
                    name="dobDay"
                    value={formData.dobDay}
                    onChange={handleChange}
                    className="px-2 sm:px-3 py-2.5 sm:py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all outline-none text-center text-sm sm:text-base font-semibold"
                    placeholder="DD"
                    maxLength={2}
                    required
                  />
                  <input
                    type="text"
                    name="dobMonth"
                    value={formData.dobMonth}
                    onChange={handleChange}
                    className="px-2 sm:px-3 py-2.5 sm:py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all outline-none text-center text-sm sm:text-base font-semibold"
                    placeholder="MM"
                    maxLength={2}
                    required
                  />
                  <input
                    type="text"
                    name="dobYear"
                    value={formData.dobYear}
                    onChange={handleChange}
                    className="px-2 sm:px-3 py-2.5 sm:py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all outline-none text-center text-sm sm:text-base font-semibold"
                    placeholder="YYYY"
                    maxLength={4}
                    required
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                  <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all outline-none text-sm sm:text-base"
                  placeholder="Street address"
                  required
                />
              </div>

              {/* City and ZIP */}
              <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 block uppercase tracking-wide">City</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all outline-none text-sm sm:text-base"
                    placeholder="City"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 block uppercase tracking-wide">ZIP Code</label>
                  <input
                    type="text"
                    name="zip"
                    value={formData.zip}
                    onChange={handleChange}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all outline-none text-sm sm:text-base"
                    placeholder="ZIP Code"
                    required
                  />
                </div>
              </div>

              {/* State and Country */}
              <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 block uppercase tracking-wide">State/Province</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all outline-none text-sm sm:text-base"
                    placeholder="State/Province"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 block uppercase tracking-wide">Country</label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all outline-none text-sm sm:text-base"
                    placeholder="Country"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Registration Type Section */}
          <div className="px-4 sm:px-6 lg:px-10 pb-6 sm:pb-8 space-y-5 sm:space-y-6 lg:space-y-8">
            <div className="flex items-center gap-2 sm:gap-3 pb-3 sm:pb-4 border-b border-gray-200">
              <div className="w-1 h-6 sm:h-8 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Registration Type</h3>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Solo Option */}
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, registrationType: 'solo' }))}
                className={`group relative p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all ${
                  formData.registrationType === 'solo'
                    ? 'bg-blue-50 border-blue-500 shadow-lg shadow-blue-100'
                    : 'bg-gray-50 border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                }`}
              >
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div className={`p-2 sm:p-3 rounded-xl transition-all ${
                    formData.registrationType === 'solo'
                      ? 'bg-blue-100'
                      : 'bg-gray-100'
                  }`}>
                    <User className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-blue-600" />
                  </div>
                  <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 transition-all flex items-center justify-center ${
                    formData.registrationType === 'solo'
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {formData.registrationType === 'solo' && (
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                
                <div className="text-left space-y-1.5 sm:space-y-2">
                  <h4 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Solo</h4>
                  <p className="text-xs sm:text-sm text-gray-600">Individual performance showcase</p>
                  <div className="pt-1 sm:pt-2">
                    <div className="inline-flex items-baseline gap-1 px-3 sm:px-4 py-1.5 sm:py-2 bg-yellow-100 rounded-lg border border-yellow-300">
                      <span className="text-xl sm:text-2xl font-bold text-yellow-700">₹1000</span>
                      <span className="text-xs sm:text-sm text-yellow-600">/-</span>
                    </div>
                  </div>
                </div>
              </button>

              {/* Group Option */}
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, registrationType: 'group' }))}
                className={`group relative p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all ${
                  formData.registrationType === 'group'
                    ? 'bg-purple-50 border-purple-500 shadow-lg shadow-purple-100'
                    : 'bg-gray-50 border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                }`}
              >
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div className={`p-2 sm:p-3 rounded-xl transition-all ${
                    formData.registrationType === 'group'
                      ? 'bg-purple-100'
                      : 'bg-gray-100'
                  }`}>
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-purple-600" />
                  </div>
                  <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 transition-all flex items-center justify-center ${
                    formData.registrationType === 'group'
                      ? 'bg-purple-500 border-purple-500'
                      : 'border-gray-300'
                  }`}>
                    {formData.registrationType === 'group' && (
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                
                <div className="text-left space-y-1.5 sm:space-y-2">
                  <h4 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Group</h4>
                  <p className="text-xs sm:text-sm text-gray-600">Collaborative team performance</p>
                  <div className="pt-1 sm:pt-2">
                    <div className="inline-flex items-baseline gap-1 px-3 sm:px-4 py-1.5 sm:py-2 bg-yellow-100 rounded-lg border border-yellow-300">
                      <span className="text-xl sm:text-2xl font-bold text-yellow-700">₹1500</span>
                      <span className="text-xs sm:text-sm text-yellow-600">/-</span>
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {/* Solo Dance Styles */}
            {formData.registrationType === 'solo' && (
              <div className="p-4 sm:p-5 lg:p-6 bg-blue-50 rounded-xl sm:rounded-2xl border border-blue-200 animate-slideIn">
                <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
                  <Music className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  <h4 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">Select Your Dance Style</h4>
                </div>
                <div className="space-y-2 sm:space-y-3">
                  {danceStyles.map(style => (
                    <label key={style} className="flex items-center gap-2 sm:gap-3 cursor-pointer group p-2.5 sm:p-3 rounded-lg hover:bg-blue-100/50 transition-all">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={formData.danceStyle.includes(style)}
                          onChange={() => handleStyleChange(style)}
                          className="appearance-none w-5 h-5 sm:w-6 sm:h-6 rounded-lg border-2 border-gray-300 bg-white checked:bg-blue-500 checked:border-blue-500 cursor-pointer transition-all"
                        />
                        {formData.danceStyle.includes(style) && (
                          <svg className="absolute inset-0 m-auto w-3 h-3 sm:w-4 sm:h-4 text-white pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm sm:text-base text-gray-700 group-hover:text-blue-700 transition-colors font-medium">{style}</span>
                    </label>
                  ))}
                  <div className="flex gap-2 sm:gap-3 items-center p-2.5 sm:p-3 rounded-lg hover:bg-blue-100/50 transition-all">
                    <div className="relative flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={formData.otherStyle !== ''}
                        onChange={(e) => !e.target.checked && setFormData(prev => ({ ...prev, otherStyle: '' }))}
                        className="appearance-none w-5 h-5 sm:w-6 sm:h-6 rounded-lg border-2 border-gray-300 bg-white checked:bg-blue-500 checked:border-blue-500 cursor-pointer transition-all"
                      />
                      {formData.otherStyle !== '' && (
                        <svg className="absolute inset-0 m-auto w-3 h-3 sm:w-4 sm:h-4 text-white pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <input
                      type="text"
                      name="otherStyle"
                      value={formData.otherStyle}
                      onChange={handleChange}
                      className="flex-1 px-3 sm:px-4 py-2 bg-white border-2 border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none text-sm sm:text-base"
                      placeholder="Other (please specify)"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Group Details */}
            {formData.registrationType === 'group' && (
              <div className="p-4 sm:p-5 lg:p-6 bg-purple-50 rounded-xl sm:rounded-2xl border border-purple-200 space-y-4 sm:space-y-5 animate-slideIn">
                <div className="flex items-center gap-2 sm:gap-3 mb-2">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                  <h4 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">Group Details</h4>
                </div>
                
                <div>
                  <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 block uppercase tracking-wide">Group Name</label>
                  <input
                    type="text"
                    name="groupName"
                    value={formData.groupName}
                    onChange={handleChange}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none text-sm sm:text-base"
                    placeholder="Enter your group name"
                    required={formData.registrationType === 'group'}
                  />
                </div>
                
                <div>
                  <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 block uppercase tracking-wide">Number of Dancers</label>
                  <input
                    type="number"
                    name="numDancers"
                    value={formData.numDancers}
                    onChange={handleChange}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none text-sm sm:text-base"
                    placeholder="Enter number of dancers"
                    min="2"
                    required={formData.registrationType === 'group'}
                  />
                </div>
                
                <div>
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <Music className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                    <h5 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900">Select Dance Styles</h5>
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    {danceStyles.map(style => (
                      <label key={style} className="flex items-center gap-2 sm:gap-3 cursor-pointer group p-2.5 sm:p-3 rounded-lg hover:bg-purple-100/50 transition-all">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={formData.groupDanceStyle.includes(style)}
                            onChange={() => handleStyleChange(style, true)}
                            className="appearance-none w-5 h-5 sm:w-6 sm:h-6 rounded-lg border-2 border-gray-300 bg-white checked:bg-purple-500 checked:border-purple-500 cursor-pointer transition-all"
                          />
                          {formData.groupDanceStyle.includes(style) && (
                            <svg className="absolute inset-0 m-auto w-3 h-3 sm:w-4 sm:h-4 text-white pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm sm:text-base text-gray-700 group-hover:text-purple-700 transition-colors font-medium">{style}</span>
                      </label>
                    ))}
                    <div className="flex gap-2 sm:gap-3 items-center p-2.5 sm:p-3 rounded-lg hover:bg-purple-100/50 transition-all">
                      <div className="relative flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={formData.groupOtherStyle !== ''}
                          onChange={(e) => !e.target.checked && setFormData(prev => ({ ...prev, groupOtherStyle: '' }))}
                          className="appearance-none w-5 h-5 sm:w-6 sm:h-6 rounded-lg border-2 border-gray-300 bg-white checked:bg-purple-500 checked:border-purple-500 cursor-pointer transition-all"
                        />
                        {formData.groupOtherStyle !== '' && (
                          <svg className="absolute inset-0 m-auto w-3 h-3 sm:w-4 sm:h-4 text-white pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <input
                        type="text"
                        name="groupOtherStyle"
                        value={formData.groupOtherStyle}
                        onChange={handleChange}
                        className="flex-1 px-3 sm:px-4 py-2 bg-white border-2 border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all outline-none text-sm sm:text-base"
                        placeholder="Other (please specify)"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Terms & Conditions */}
          <div className="px-4 sm:px-6 lg:px-10 pb-6 sm:pb-8 space-y-5 sm:space-y-6 lg:space-y-8">
            <div className="flex items-center gap-2 sm:gap-3 pb-3 sm:pb-4 border-b border-gray-200">
              <div className="w-1 h-6 sm:h-8 bg-gradient-to-b from-yellow-500 to-orange-500 rounded-full"></div>
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Terms & Conditions</h3>
            </div>

            <div className="p-4 sm:p-5 lg:p-6 bg-yellow-50 rounded-xl sm:rounded-2xl border-2 border-yellow-200">
              <div className="flex items-start gap-2 sm:gap-3 mb-4 sm:mb-5">
                <div className="p-2 sm:p-2.5 bg-yellow-100 rounded-lg flex-shrink-0">
                  <Award className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-700" />
                </div>
                <div>
                  <p className="text-sm sm:text-base text-gray-900 font-bold mb-0.5 sm:mb-1">Agreement Required</p>
                  <p className="text-xs sm:text-sm text-gray-600">By submitting this form, you agree to the following:</p>
                </div>
              </div>
              
              <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-gray-700 mb-5 sm:mb-6">
                <li className="flex gap-2 sm:gap-3 items-start p-2.5 sm:p-3 bg-white rounded-lg">
                  <span className="text-yellow-600 text-base sm:text-lg flex-shrink-0">•</span>
                  <span className="leading-relaxed">The event organizers are not responsible for any injuries or accidents during the competition.</span>
                </li>
                <li className="flex gap-2 sm:gap-3 items-start p-2.5 sm:p-3 bg-white rounded-lg">
                  <span className="text-yellow-600 text-base sm:text-lg flex-shrink-0">•</span>
                  <span className="leading-relaxed">Participants must comply with the rules and regulations of the Northeast Grand Dance League.</span>
                </li>
                <li className="flex gap-2 sm:gap-3 items-start p-2.5 sm:p-3 bg-white rounded-lg">
                  <span className="text-yellow-600 text-base sm:text-lg flex-shrink-0">•</span>
                  <span className="leading-relaxed">All registrations are final and non-refundable.</span>
                </li>
                <li className="flex gap-2 sm:gap-3 items-start p-2.5 sm:p-3 bg-white rounded-lg">
                  <span className="text-yellow-600 text-base sm:text-lg flex-shrink-0">•</span>
                  <span className="leading-relaxed">The competition will be filmed and photos taken for promotional purposes.</span>
                </li>
              </ul>

              <label className="flex items-start gap-2 sm:gap-3 cursor-pointer group p-3 sm:p-4 bg-white rounded-lg hover:bg-yellow-100/50 transition-all border-2 border-transparent hover:border-yellow-300">
                <div className="relative flex-shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    name="agreed"
                    checked={formData.agreed}
                    onChange={handleChange}
                    className="appearance-none w-5 h-5 sm:w-6 sm:h-6 rounded-lg border-2 border-gray-300 bg-gray-50 checked:bg-yellow-500 checked:border-yellow-500 cursor-pointer transition-all"
                    required
                  />
                  {formData.agreed && (
                    <svg className="absolute inset-0 m-auto w-3 h-3 sm:w-4 sm:h-4 text-white pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-xs sm:text-sm text-gray-700 group-hover:text-yellow-800 transition-colors font-medium leading-relaxed">
                  I have read and agree to all terms and conditions outlined above
                </span>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="px-4 sm:px-6 lg:px-10 pb-6 sm:pb-8 lg:pb-10">
            <button
              type="submit"
              disabled={!formData.agreed}
              className="relative w-full py-3 sm:py-4 lg:py-5 px-4 sm:px-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 disabled:from-gray-400 disabled:via-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-bold text-sm sm:text-base lg:text-lg rounded-xl sm:rounded-2xl shadow-xl hover:shadow-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 disabled:opacity-60 overflow-hidden group"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {formData.agreed ? (
                  <>
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Submit Registration</span>
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                  </>
                ) : (
                  <span className="text-xs sm:text-sm lg:text-base">Please Accept Terms & Conditions</span>
                )}
              </span>
              {formData.agreed && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              )}
            </button>
            
            <p className="text-center text-xs sm:text-sm text-gray-500 mt-3 sm:mt-4">
              Secure registration powered by Northeast Grand Dance League
            </p>
          </div>

          {/* Footer */}
          <div className="bg-gradient-to-r from-gray-100 to-gray-50 px-4 sm:px-6 lg:px-10 py-5 sm:py-6 border-t border-gray-200">
            <div className="text-center space-y-2 sm:space-y-3">
              <div className="flex items-center justify-center gap-2">
                <div className="h-px w-8 sm:w-12 bg-gradient-to-r from-transparent to-blue-400"></div>
                <p className="text-gray-700 text-xs sm:text-sm font-semibold">
                  Presented by <span className="text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text font-bold">MotionX</span>
                </p>
                <div className="h-px w-8 sm:w-12 bg-gradient-to-l from-transparent to-purple-400"></div>
              </div>
              <p className="text-gray-600 text-xs sm:text-sm">
                For inquiries, contact us at <a href="mailto:info@northeastdanceleague.com" className="text-blue-600 hover:text-blue-700 transition-colors underline">info@northeastdanceleague.com</a>
              </p>
              <p className="text-gray-500 text-xs">
                © 2026 Northeast Grand Dance League. All rights reserved.
              </p>
            </div>
          </div>
        </form>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}