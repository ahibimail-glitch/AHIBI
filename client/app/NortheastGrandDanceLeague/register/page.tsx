"use client"
import React, { useState, ChangeEvent, FormEvent } from 'react';
import { User, Mail, Phone, Calendar, MapPin, Users, Music, Award, Download, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function DanceRegistrationForm() {
  const router = useRouter();
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

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [registrationData, setRegistrationData] = useState<any>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    setFormErrors(prev => {
      if (!prev[name]) return prev;
      const { [name]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const handleStyleChange = (style: string, isGroup = false) => {
    const field = isGroup ? 'groupDanceStyle' : 'danceStyle';
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(style)
        ? prev[field].filter(s => s !== style)
        : [...prev[field], style]
    }));

    setFormErrors(prev => {
      const key = isGroup ? 'groupDanceStyle' : 'danceStyle';
      if (!prev[key]) return prev;
      const { [key]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    const isBlank = (v: string) => !v || !v.trim();

    if (isBlank(formData.fullName)) errors.fullName = 'Full name is required.';

    if (isBlank(formData.email)) {
      errors.email = 'Email is required.';
    } else {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim());
      if (!emailOk) errors.email = 'Please enter a valid email address.';
    }

    if (isBlank(formData.phone)) {
      errors.phone = 'Phone number is required.';
    } else {
      const digits = formData.phone.replace(/\D/g, '');
      if (digits.length < 10) errors.phone = 'Please enter a valid phone number.';
    }

    if (isBlank(formData.dobDay)) errors.dobDay = 'Day is required.';
    if (isBlank(formData.dobMonth)) errors.dobMonth = 'Month is required.';
    if (isBlank(formData.dobYear)) errors.dobYear = 'Year is required.';

    if (!errors.dobDay && !errors.dobMonth && !errors.dobYear) {
      const day = Number(formData.dobDay);
      const month = Number(formData.dobMonth);
      const year = Number(formData.dobYear);
      const yearOk = Number.isFinite(year) && formData.dobYear.trim().length === 4 && year >= 1900;
      const monthOk = Number.isFinite(month) && month >= 1 && month <= 12;
      const dayOk = Number.isFinite(day) && day >= 1 && day <= 31;
      if (!dayOk) errors.dobDay = 'Enter a valid day.';
      if (!monthOk) errors.dobMonth = 'Enter a valid month.';
      if (!yearOk) errors.dobYear = 'Enter a valid year.';
    }

    if (isBlank(formData.address)) errors.address = 'Address is required.';
    if (isBlank(formData.city)) errors.city = 'City is required.';
    if (isBlank(formData.zip)) errors.zip = 'ZIP code is required.';
    if (isBlank(formData.state)) errors.state = 'State/Province is required.';
    if (isBlank(formData.country)) errors.country = 'Country is required.';

    if (formData.registrationType === 'solo') {
      const hasStyle = formData.danceStyle.length > 0 || !isBlank(formData.otherStyle);
      if (!hasStyle) errors.danceStyle = 'Please select at least one dance style.';
    }

    if (formData.registrationType === 'group') {
      if (isBlank(formData.groupName)) errors.groupName = 'Group name is required.';

      if (isBlank(formData.numDancers)) {
        errors.numDancers = 'Number of dancers is required.';
      } else {
        const n = Number(formData.numDancers);
        if (!Number.isFinite(n) || n < 2) errors.numDancers = 'Minimum 2 dancers are required.';
      }

      const hasGroupStyle = formData.groupDanceStyle.length > 0 || !isBlank(formData.groupOtherStyle);
      if (!hasGroupStyle) errors.groupDanceStyle = 'Please select at least one dance style.';
    }

    if (!formData.agreed) errors.agreed = 'You must accept the terms & conditions.';

    setFormErrors(errors);

    const firstKey = Object.keys(errors)[0];
    if (firstKey) {
      const el = document.querySelector(`[name="${firstKey}"]`) as HTMLElement | null;
      if (el?.focus) el.focus();
    }

    return Object.keys(errors).length === 0;
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePaymentSuccess = async (paymentData: any, registrationId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dance-league/verify-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          razorpay_order_id: paymentData.razorpay_order_id,
          razorpay_payment_id: paymentData.razorpay_payment_id,
          razorpay_signature: paymentData.razorpay_signature,
          registrationId
        })
      });

      const result = await response.json();

      if (result.success) {
        setRegistrationData(result.data);
        setShowSuccess(true);
      } else {
        alert('Payment verification failed. Please contact support.');
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      alert('An error occurred while verifying payment. Please contact support.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        alert('Failed to load payment gateway. Please try again.');
        setLoading(false);
        return;
      }

      // Create registration order
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dance-league/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (!result.success) {
        alert(result.message || 'Failed to create registration order');
        setLoading(false);
        return;
      }

      // Initialize Razorpay payment
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: result.data.amount,
        currency: result.data.currency,
        name: 'Northeast Grand Dance League',
        description: `${formData.registrationType === 'solo' ? 'Solo' : 'Group'} Registration`,
        order_id: result.data.orderId,
        handler: function (response: any) {
          handlePaymentSuccess(response, result.data.registrationId);
        },
        prefill: {
          name: formData.fullName,
          email: formData.email,
          contact: formData.phone
        },
        theme: {
          color: '#4F46E5'
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
            alert('Payment cancelled. Your registration is not complete.');
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (error) {
      console.error('Error submitting registration:', error);
      alert('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!registrationData?.invoiceNumber) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/dance-league/invoice/${registrationData.invoiceNumber}`
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${registrationData.invoiceNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
      alert('Failed to download invoice. Please try again.');
    }
  };

  const danceStyles = ['Ballet', 'Hip Hop', 'Contemporary', 'Jazz', 'Tap'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 py-4 sm:py-8 lg:py-12 px-3 sm:px-4 lg:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Cover Image Section */}
        <div className="relative w-full  rounded-2xl sm:rounded-3xl overflow-hidden mb-6 sm:mb-8 lg:mb-12 shadow-2xl">
          {/* Mobile image */}
          <img
            src="/images/NEDLPH.jpeg"
            alt="Northeast Grand Dance League"
            className="block md:hidden w-full h-full object-cover"
          />

          {/* Desktop image */}
          <img
            src="/images/NEDL.jpeg"
            alt="Northeast Grand Dance League"
            className="hidden md:block w-full h-full object-cover"
          />
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
          {/* Decorative gradient line */}
          <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

          {/* Form Title */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-4 sm:px-6 lg:px-10 py-5 sm:py-6 lg:py-8 border-b border-gray-200">
            <div className="flex items-center gap-3">
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
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border-2 rounded-xl text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all outline-none text-sm sm:text-base ${formErrors.fullName ? 'border-red-500' : 'border-gray-200'}`}
                  placeholder="Enter your full name"
                  required
                />
                {formErrors.fullName && (
                  <p className="mt-1 text-xs sm:text-sm text-red-600 font-medium">{formErrors.fullName}</p>
                )}
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
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border-2 rounded-xl text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all outline-none text-sm sm:text-base ${formErrors.email ? 'border-red-500' : 'border-gray-200'}`}
                  placeholder="your.email@example.com"
                  required
                />
                {formErrors.email && (
                  <p className="mt-1 text-xs sm:text-sm text-red-600 font-medium">{formErrors.email}</p>
                )}
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
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border-2 rounded-xl text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all outline-none text-sm sm:text-base ${formErrors.phone ? 'border-red-500' : 'border-gray-200'}`}
                  placeholder="(123) 456-7890"
                  required
                />
                {formErrors.phone && (
                  <p className="mt-1 text-xs sm:text-sm text-red-600 font-medium">{formErrors.phone}</p>
                )}
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
                    className={`px-2 sm:px-3 py-2.5 sm:py-3 bg-gray-50 border-2 rounded-xl text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all outline-none text-center text-sm sm:text-base font-semibold ${formErrors.dobDay ? 'border-red-500' : 'border-gray-200'}`}
                    placeholder="DD"
                    maxLength={2}
                    required
                  />
                  <input
                    type="text"
                    name="dobMonth"
                    value={formData.dobMonth}
                    onChange={handleChange}
                    className={`px-2 sm:px-3 py-2.5 sm:py-3 bg-gray-50 border-2 rounded-xl text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all outline-none text-center text-sm sm:text-base font-semibold ${formErrors.dobMonth ? 'border-red-500' : 'border-gray-200'}`}
                    placeholder="MM"
                    maxLength={2}
                    required
                  />
                  <input
                    type="text"
                    name="dobYear"
                    value={formData.dobYear}
                    onChange={handleChange}
                    className={`px-2 sm:px-3 py-2.5 sm:py-3 bg-gray-50 border-2 rounded-xl text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all outline-none text-center text-sm sm:text-base font-semibold ${formErrors.dobYear ? 'border-red-500' : 'border-gray-200'}`}
                    placeholder="YYYY"
                    maxLength={4}
                    required
                  />
                </div>
                {(formErrors.dobDay || formErrors.dobMonth || formErrors.dobYear) && (
                  <p className="mt-1 text-xs sm:text-sm text-red-600 font-medium">
                    {formErrors.dobDay || formErrors.dobMonth || formErrors.dobYear}
                  </p>
                )}
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
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border-2 rounded-xl text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all outline-none text-sm sm:text-base ${formErrors.address ? 'border-red-500' : 'border-gray-200'}`}
                  placeholder="Street address"
                  required
                />
                {formErrors.address && (
                  <p className="mt-1 text-xs sm:text-sm text-red-600 font-medium">{formErrors.address}</p>
                )}
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
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border-2 rounded-xl text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all outline-none text-sm sm:text-base ${formErrors.city ? 'border-red-500' : 'border-gray-200'}`}
                    placeholder="City"
                    required
                  />
                  {formErrors.city && (
                    <p className="mt-1 text-xs sm:text-sm text-red-600 font-medium">{formErrors.city}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 block uppercase tracking-wide">ZIP Code</label>
                  <input
                    type="text"
                    name="zip"
                    value={formData.zip}
                    onChange={handleChange}
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border-2 rounded-xl text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all outline-none text-sm sm:text-base ${formErrors.zip ? 'border-red-500' : 'border-gray-200'}`}
                    placeholder="ZIP Code"
                    required
                  />
                  {formErrors.zip && (
                    <p className="mt-1 text-xs sm:text-sm text-red-600 font-medium">{formErrors.zip}</p>
                  )}
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
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border-2 rounded-xl text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all outline-none text-sm sm:text-base ${formErrors.state ? 'border-red-500' : 'border-gray-200'}`}
                    placeholder="State/Province"
                    required
                  />
                  {formErrors.state && (
                    <p className="mt-1 text-xs sm:text-sm text-red-600 font-medium">{formErrors.state}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 block uppercase tracking-wide">Country</label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border-2 rounded-xl text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all outline-none text-sm sm:text-base ${formErrors.country ? 'border-red-500' : 'border-gray-200'}`}
                    placeholder="Country"
                    required
                  />
                  {formErrors.country && (
                    <p className="mt-1 text-xs sm:text-sm text-red-600 font-medium">{formErrors.country}</p>
                  )}
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
                onClick={() => {
                  setFormData(prev => ({ ...prev, registrationType: 'solo' }));
                  setFormErrors(prev => {
                    const { groupName: _groupName, numDancers: _numDancers, groupDanceStyle: _groupDanceStyle, ...rest } = prev;
                    return rest;
                  });
                }}
                className={`group relative p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all ${formData.registrationType === 'solo'
                    ? 'bg-blue-50 border-blue-500 shadow-lg shadow-blue-100'
                    : 'bg-gray-50 border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                  }`}
              >
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div className={`p-2 sm:p-3 rounded-xl transition-all ${formData.registrationType === 'solo'
                      ? 'bg-blue-100'
                      : 'bg-gray-100'
                    }`}>
                    <User className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-blue-600" />
                  </div>
                  <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 transition-all flex items-center justify-center ${formData.registrationType === 'solo'
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
                onClick={() => {
                  setFormData(prev => ({ ...prev, registrationType: 'group' }));
                  setFormErrors(prev => {
                    const { danceStyle: _danceStyle, ...rest } = prev;
                    return rest;
                  });
                }}
                className={`group relative p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all ${formData.registrationType === 'group'
                    ? 'bg-purple-50 border-purple-500 shadow-lg shadow-purple-100'
                    : 'bg-gray-50 border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                  }`}
              >
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div className={`p-2 sm:p-3 rounded-xl transition-all ${formData.registrationType === 'group'
                      ? 'bg-purple-100'
                      : 'bg-gray-100'
                    }`}>
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-purple-600" />
                  </div>
                  <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 transition-all flex items-center justify-center ${formData.registrationType === 'group'
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
                {formErrors.danceStyle && (
                  <p className="mb-3 text-xs sm:text-sm text-red-600 font-medium">{formErrors.danceStyle}</p>
                )}
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
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border-2 rounded-xl text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none text-sm sm:text-base ${formErrors.groupName ? 'border-red-500' : 'border-gray-200'}`}
                    placeholder="Enter your group name"
                    required={formData.registrationType === 'group'}
                  />
                  {formErrors.groupName && (
                    <p className="mt-1 text-xs sm:text-sm text-red-600 font-medium">{formErrors.groupName}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 block uppercase tracking-wide">Number of Dancers</label>
                  <input
                    type="number"
                    name="numDancers"
                    value={formData.numDancers}
                    onChange={handleChange}
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border-2 rounded-xl text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none text-sm sm:text-base ${formErrors.numDancers ? 'border-red-500' : 'border-gray-200'}`}
                    placeholder="Enter number of dancers"
                    min="2"
                    required={formData.registrationType === 'group'}
                  />
                  {formErrors.numDancers && (
                    <p className="mt-1 text-xs sm:text-sm text-red-600 font-medium">{formErrors.numDancers}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <Music className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                    <h5 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900">Select Dance Styles</h5>
                  </div>
                  {formErrors.groupDanceStyle && (
                    <p className="mb-3 text-xs sm:text-sm text-red-600 font-medium">{formErrors.groupDanceStyle}</p>
                  )}
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

              <label className={`flex items-start gap-2 sm:gap-3 cursor-pointer group p-3 sm:p-4 bg-white rounded-lg hover:bg-yellow-100/50 transition-all border-2 hover:border-yellow-300 ${formErrors.agreed ? 'border-red-500' : 'border-transparent'}`}>
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
              {formErrors.agreed && (
                <p className="mt-2 text-xs sm:text-sm text-red-600 font-medium">{formErrors.agreed}</p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="px-4 sm:px-6 lg:px-10 pb-6 sm:pb-8 lg:pb-10">
            <button
              type="submit"
              disabled={!formData.agreed || loading}
              className="relative w-full py-3 sm:py-4 lg:py-5 px-4 sm:px-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 disabled:from-gray-400 disabled:via-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-bold text-sm sm:text-base lg:text-lg rounded-xl sm:rounded-2xl shadow-xl hover:shadow-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 disabled:opacity-60 overflow-hidden group"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {formData.agreed ? (
                  <>
                    {/* <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" /> */}
                    <span>Submit Registration</span>
                    {/* <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" /> */}
                  </>
                ) : (
                  <span className="text-xs sm:text-sm lg:text-base">Please Accept Terms & Conditions</span>
                )}
              </span>
              {formData.agreed && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              )}
            </button>

          </div>

          
        </form>

        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl p-8 shadow-2xl">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600"></div>
                <p className="text-lg font-semibold text-gray-900">Processing your registration...</p>
                <p className="text-sm text-gray-600">Please do not close this window</p>
              </div>
            </div>
          </div>
        )}

        {/* Success Modal */}
        {showSuccess && registrationData && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 rounded-t-3xl">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center">
                    <CheckCircle className="w-12 h-12 text-green-500" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-white text-center">Registration Successful!</h2>
                <p className="text-green-50 text-center mt-2">Your payment has been confirmed</p>
              </div>

              <div className="p-8 space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border-2 border-blue-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Registration Details</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Registration Number:</span>
                      <span className="text-purple-600 font-bold text-lg">{registrationData.registrationNumber}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Invoice Number:</span>
                      <span className="text-gray-900 font-semibold">{registrationData.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Participant:</span>
                      <span className="text-gray-900 font-semibold">{registrationData.registration.fullName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Registration Type:</span>
                      <span className="text-gray-900 font-semibold uppercase">{registrationData.registration.registrationType}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Amount Paid:</span>
                      <span className="text-green-600 font-bold text-lg">₹{registrationData.registration.amount}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6">
                  <div className="flex items-start gap-3">
                    <Award className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-bold text-yellow-900 mb-2">Important Information</h4>
                      <ul className="text-sm text-yellow-800 space-y-2">
                        <li>• Please save your registration number for future reference</li>
                        <li>• Download your invoice using the button below</li>
                        <li>• A confirmation email has been sent to {registrationData.registration.email}</li>
                        <li>• Bring a printed copy of your invoice on the event day</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={handleDownloadInvoice}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg font-semibold"
                  >
                    <Download className="w-5 h-5" />
                    Download Invoice
                  </button>
                  <button
                    onClick={() => router.push('/')}
                    className="flex-1 px-6 py-4 bg-gray-100 text-gray-900 rounded-xl hover:bg-gray-200 transition-all font-semibold"
                  >
                    Go to Home
                  </button>
                </div>

                <p className="text-center text-sm text-gray-500">
                  Thank you for registering with Northeast Grand Dance League!
                </p>
              </div>
            </div>
          </div>
        )}
 
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