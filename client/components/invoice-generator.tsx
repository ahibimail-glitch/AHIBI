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
  invoiceData: InvoiceData | InvoiceData[];
  onDownload?: () => void;
}

const InvoiceCard: React.FC<{ data: InvoiceData; onDownload?: () => void }> = ({ data, onDownload }) => {
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
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      const options = {
        scale: 2,
        useCORS: true,
        logging: true,
        backgroundColor: '#ffffff',
        allowTaint: true,
        scrollX: 0,
        scrollY: 0,
        windowWidth: document.documentElement.offsetWidth,
        windowHeight: document.documentElement.offsetHeight,
        height: ticketRef.current.scrollHeight,
        width: ticketRef.current.scrollWidth,
      };

      alert("Generating PDF, please wait...");

      // @ts-ignore
      const canvas = await html2canvas(ticketRef.current, options);
      const imgData = canvas.toDataURL('image/png', 1.0);

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const finalImgHeight = Math.min(imgHeight, pageHeight - 20);
      const finalImgWidth = finalImgHeight * (canvas.width / canvas.height);
      const xOffset = (pageWidth - finalImgWidth) / 2;

      pdf.addImage({ imageData: imgData, x: xOffset, y: 10, width: finalImgWidth, height: finalImgHeight, compression: 'FAST' });

      const footerText = `Invoice ID: ${data.bookingId}`;
      const fontSize = 8;
      const textWidth = pdf.getStringUnitWidth(footerText) * fontSize / pdf.internal.scaleFactor;
      const textX = (pageWidth - textWidth) / 2;
      const textY = pageHeight - 10;

      pdf.setFontSize(fontSize);
      pdf.text(footerText, textX, textY);

      const eventName = data.eventTitle?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'invoice';
      const fileName = `${eventName}_invoice_${data.bookingId?.slice(-6) || Date.now()}.pdf`;
      pdf.save(fileName);

      if (onDownload) onDownload();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to download invoice. Please try again.');
    }
  };

  // QR
  let qrUrl = '';
  let rawData = '';
  try {
    const rawDataObject = {
      bookingId: data.bookingId,
      bookingDate: formatDate(data.bookingDate),
      name: data.customerName,
      email: data.customerEmail,
      phone: data.customerPhone,
      event: data.eventTitle,
      ticketType: data.ticketType,
      seats: data.seats.length,
      pricePerTicket: formatCurrency(data.seats[0]?.price || 0),
      total: formatCurrency(data.totalAmount),
      invoiceId: `${data.bookingId}_invoice`
    };
    rawData = JSON.stringify(rawDataObject);
    qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(rawData)}&size=200x200&margin=10`;
  } catch (err: any) {
    console.error('Error generating QR code:', err);
  }


  return (
    <div className="max-w-md mx-auto my-10 p-4 font-sans">
      <div ref={ticketRef} id={`booking-ticket-${data.bookingId}`} className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 px-6 py-6 relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full -ml-10 -mb-10"></div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-full h-6  rounded-lg flex items-center justify-center">
                <img src="/images/Logo.png" className='w-1/2 h-14' alt="Logo" />
              </div>
            </div>
            <p className="text-white/90 text-sm font-medium pt-2">Booking Confirmed for</p>
            <h1 className="text-white text-2xl font-bold tracking-tight">{data.eventTitle}</h1>
          </div>
        </div>

        <div className="px-6 py-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-6 border border-blue-100">
            <div className="text-center mb-4">
              <p className="text-sm font-semibold text-indigo-500 uppercase tracking-wider">Ticket Type</p>
              <h2 className="text-3xl font-extrabold text-indigo-700 tracking-tight">
                {data.ticketType || data.seats[0]?.category || 'GENERAL'}
              </h2>
              {data.benefits && data.benefits.length > 0 && (
                <p className='text-sm text-[#00CED1] font-medium'>
                  {data.benefits.slice(0, 2).join(' || ')}
                </p>
              )}
              <div className="mt-2">
                <p className="text-sm text-indigo-600 font-medium">
                  {data.seats.length} Seat{data.seats.length > 1 ? 's' : ''} Booked
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-blue-200 pt-4">
              <div className="text-center">
                <Calendar className="w-5 h-5 text-blue-600 mx-auto mb-2" />
                <p className="text-xs text-gray-500 uppercase tracking-wide">Date</p>
                <p className="text-sm font-bold text-gray-900">{formatDate(data.eventDate)}</p>
              </div>
              <div className="text-center">
                <Clock className="w-5 h-5 text-blue-600 mx-auto mb-2" />
                <p className="text-xs text-gray-500 uppercase tracking-wide">Time</p>
                <p className="text-sm font-bold text-gray-900">{formatTime(data.eventTime || data.eventDate)}</p>
              </div>
            </div>
          </div>

         

          <div className="border-t-2 border-dashed border-gray-200 my-6 relative">
            <div className="absolute left-0 top-0 w-6 h-6 bg-gray-50 rounded-full -ml-9 -mt-3"></div>
            <div className="absolute right-0 top-0 w-6 h-6 bg-gray-50 rounded-full -mr-9 -mt-3"></div>
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <span className="text-lg font-bold text-gray-900">Total Amount</span>
              <span className="text-2xl font-bold text-green-600">{formatCurrency(data.totalAmount)}</span>
            </div>
            
          </div>

          <div className="text-center">
            {qrUrl ? (
              <div className="flex flex-col items-center">
                <div className="border-4 border-blue-100 rounded-lg p-2 bg-white inline-block">
                  <img src={qrUrl} alt="Invoice QR Code" width={180} height={180} className="mx-auto" />
                </div>
                <div className="mt-4 text-center">
                  <p className="text-sm font-medium text-blue-700">Scan at {data.eventLocation || "Event Location"}</p>
                </div>
              </div>
            ) : (
              <div className="text-center p-4 border-2 border-dashed rounded-lg">
                <p className="text-sm text-gray-500">QR code is being generated. Please wait...</p>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t mt-6">
          <div className="flex gap-3">
            <button onClick={handleDownloadTicket} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium text-sm transition-colors duration-200 flex items-center justify-center disabled:bg-blue-300">
              <DownloadIcon className="w-4 h-4 mr-2" />
              Download Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const InvoiceGenerator: React.FC<InvoiceGeneratorProps> = ({ invoiceData, onDownload }) => {
  if (Array.isArray(invoiceData)) {
    return (
      <div className="space-y-6">
        {invoiceData.map(inv => (
          <InvoiceCard key={inv.bookingId} data={inv} onDownload={onDownload} />
        ))}
      </div>
    );
  }

  return <InvoiceCard data={invoiceData} onDownload={onDownload} />;
};

export default InvoiceGenerator;
