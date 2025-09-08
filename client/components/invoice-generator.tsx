import React, { useRef } from 'react';
import { FileText, Calendar, Clock, Users, MapPin, CreditCard, Download as DownloadIcon, QrCode, Share2, Star, Ticket, XCircle } from 'lucide-react';

interface InvoiceData {
  bookingId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  seats: Array<{
    id: string;
    price: number;
    category?: string;
  }>;
  totalAmount: number;
  paymentId: string;
  transactionId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  bookingDate: string;
  ticketType?: string;
  benefits?: string[];
}

interface InvoiceGeneratorProps {
  invoiceData: InvoiceData;
  onDownload?: () => void;
}

const InvoiceGenerator: React.FC<InvoiceGeneratorProps> = ({ invoiceData, onDownload }) => {
  const ticketRef = useRef<HTMLDivElement>(null);

  const formatDate = (date: string | number | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (date: string | number | Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const handleDownloadTicket = async () => {
    if (!ticketRef.current) return;

    try {
      // Dynamically import the required libraries
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      // Improved options for better capture
      const options = {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        logging: true,
        backgroundColor: '#ffffff',
        allowTaint: true,
        scrollX: 0,
        scrollY: 0,
        windowWidth: document.documentElement.offsetWidth,
        windowHeight: document.documentElement.offsetHeight,
        // Ensure the full height is captured
        height: ticketRef.current.scrollHeight,
        width: ticketRef.current.scrollWidth,
      };

      // Display loading indicator
      alert("Generating PDF, please wait...");

      // @ts-ignore - html2canvas types might be outdated
      const canvas = await html2canvas(ticketRef.current, options);

      const imgData = canvas.toDataURL('image/png', 1.0);

      // Create PDF with appropriate dimensions
      // Use A4 for more space
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Calculate dimensions for the PDF
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Calculate the best fit while preserving aspect ratio
      const imgWidth = pageWidth - 20; // 10mm margins on each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // If image height is too large for the page, scale it down
      const finalImgHeight = Math.min(imgHeight, pageHeight - 20);
      const finalImgWidth = finalImgHeight * (canvas.width / canvas.height);

      // Center the image on the page
      const xOffset = (pageWidth - finalImgWidth) / 2;

      // Add image to PDF with margins
      pdf.addImage({
        imageData: imgData,
        x: xOffset, // Centered horizontally
        y: 10, // Top margin
        width: finalImgWidth,
        height: finalImgHeight,
        compression: 'FAST'
      });

      // Add footer text
      const footerText = `Invoice ID: ${invoiceData.bookingId}`;
      const fontSize = 8;
      const textWidth = pdf.getStringUnitWidth(footerText) * fontSize / pdf.internal.scaleFactor;
      const textX = (pageWidth - textWidth) / 2;
      const textY = pageHeight - 10; // 10mm from bottom

      pdf.setFontSize(fontSize);
      pdf.text(footerText, textX, textY);

      // Generate a filename with event name and booking ID
      const eventName = invoiceData.eventTitle?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'invoice';
      const fileName = `${eventName}_invoice_${invoiceData.bookingId?.slice(-6) || Date.now()}.pdf`;

      // Save the PDF
      pdf.save(fileName);
      
      if (onDownload) onDownload();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to download invoice. Please try again.');
    }
  };

  // --- QR Code URL Generation ---
  let qrUrl = '';
  let rawData = '';

  try {
    // Create a simpler verification data object (avoid Date objects which can cause issues)
    const rawDataObject = {
      bookingId: invoiceData.bookingId,
      bookingDate: formatDate(invoiceData.bookingDate),
      name: invoiceData.customerName,
      email: invoiceData.customerEmail,
      phone: invoiceData.customerPhone,
      event: invoiceData.eventTitle,
      ticketType: invoiceData.ticketType,
      seats: invoiceData.seats.length,
      pricePerTicket: formatCurrency(invoiceData.seats[0]?.price || 0),
      total: formatCurrency(invoiceData.totalAmount),
      // Add a unique identifier for the invoice
      invoiceId: `${invoiceData.bookingId}_invoice`
    };
    rawData = JSON.stringify(rawDataObject);

    // Use QR Server - more reliable alternative
    qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(rawData)}&size=200x200&margin=10`;
  } catch (err: any) {
    console.error('Error generating QR code:', err);
  }

  return (
    <div className="max-w-md mx-auto my-10 p-4 font-sans">
      <div ref={ticketRef} id="booking-ticket" className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Gradient Header */}
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 px-6 py-6 relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full -ml-10 -mb-10"></div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              {/* You can replace this with your actual logo component or img tag */}
              <div className="w-full h-6  rounded-lg flex items-center justify-center">
                <img src="/images/Logo.png" className='w-1/2 h-14' alt="Logo" />
              </div>
            </div>
            <p className="text-white/90 text-sm font-medium pt-2">Booking Confirmed for</p>
            <h1 className="text-white text-2xl font-bold tracking-tight">Annie Musical Night</h1>
          </div>
        </div>

        {/* Ticket Body */}
        <div className="px-6 py-6">
          {/* Ticket Type & Details Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-6 border border-blue-100">
            {/* --- THIS IS THE NEW TICKET CATEGORY SECTION --- */}
            <div className="text-center mb-4">
              <p className="text-sm font-semibold text-indigo-500 uppercase tracking-wider">Ticket Type</p>
              <h2 className="text-3xl font-extrabold text-indigo-700 tracking-tight">
                {invoiceData.seats[0].price==1500?'VIP PLATINUM':invoiceData.seats[0].price==1200?'GOLD PREMIUM':invoiceData.seats[0].price==500?'SILVER STANDARD':'GENERAL'}
              </h2>
              {/* <p className='text-sm text-[#00CED1] font-medium'>
                {invoiceData.benefits && invoiceData.benefits.length > 0 && 
                  invoiceData.benefits.slice(0, 2).join(' || ')
                }
              </p> */}
              <div className="mt-2">
                <p className="text-sm text-indigo-600 font-medium">
                  {invoiceData.seats.length} Seat{invoiceData.seats.length > 1 ? 's' : ''} Booked
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-blue-200 pt-4">
              <div className="text-center">
                <Calendar className="w-5 h-5 text-blue-600 mx-auto mb-2" />
                <p className="text-xs text-gray-500 uppercase tracking-wide">Date</p>
                <p className="text-sm font-bold text-gray-900">{formatDate(invoiceData.eventDate)}</p>
              </div>
              <div className="text-center">
                <Clock className="w-5 h-5 text-blue-600 mx-auto mb-2" />
                <p className="text-xs text-gray-500 uppercase tracking-wide">Time</p>
                <p className="text-sm font-bold text-gray-900">5:30 PM</p>
              </div>
            </div>
          </div>

          {/* Seat Details Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Seat Details</h3>
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200">
              <div className="space-y-3">
                {invoiceData.seats.map((seat, index) => (
                  <div key={index} className="flex justify-between items-center py-3 px-4 bg-white rounded-lg shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-sm">{index + 1}</span>
                      </div>
                      <div>
                        <span className="font-mono text-gray-800 font-semibold text-base">Seat {seat.id}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-gray-900 text-lg">{formatCurrency(seat.price)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Total Seats:</span>
                  <span className="font-bold text-gray-900">{invoiceData.seats.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dashed Separator */}
          <div className="border-t-2 border-dashed border-gray-200 my-6 relative">
            <div className="absolute left-0 top-0 w-6 h-6 bg-gray-50 rounded-full -ml-9 -mt-3"></div>
            <div className="absolute right-0 top-0 w-6 h-6 bg-gray-50 rounded-full -mr-9 -mt-3"></div>
          </div>

          {/* Total Amount & Payment Details */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <span className="text-lg font-bold text-gray-900">Total Amount</span>
              <span className="text-2xl font-bold text-green-600">{formatCurrency(invoiceData.totalAmount)}</span>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CreditCard className="w-4 h-4 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-green-800">Payment Successful</span>
                </div>
                <span className="text-xs font-mono text-green-700">{invoiceData.transactionId}</span>
              </div>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="text-center">
            {qrUrl ? (
              <div className="flex flex-col items-center">
                <div className="border-4 border-blue-100 rounded-lg p-2 bg-white inline-block">
                  <img
                    src={qrUrl}
                    alt="Invoice QR Code"
                    width={180}
                    height={180}
                    className="mx-auto"
                  />
                </div>
                <div className="mt-4 text-center">
                  <p className="text-sm font-medium text-blue-700">Scan at Dimapur Hall Town</p>
                  {/* Improved Invoice ID Display */}
                  {/* <div className="mt-3 bg-gray-100 px-3 py-1.5 rounded-md inline-block">
                    <p className="text-xs text-gray-500">Invoice ID</p>
                    <p className="font-mono text-sm font-bold text-gray-800 tracking-wider">
                      {invoiceData.bookingId}
                    </p>
                  </div> */}
                </div>
              </div>
            ) : (
              <div className="text-center p-4 border-2 border-dashed rounded-lg">
                <p className="text-sm text-gray-500">
                  QR code is being generated. Please wait...
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t mt-6">
          <div className="flex gap-3">
            <button
              onClick={handleDownloadTicket}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium text-sm transition-colors duration-200 flex items-center justify-center disabled:bg-blue-300"
            >
              <DownloadIcon className="w-4 h-4 mr-2" />
              Download Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceGenerator;
