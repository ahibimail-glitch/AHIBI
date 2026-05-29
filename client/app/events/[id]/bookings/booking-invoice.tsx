import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, CreditCard, Download as DownloadIcon, MapPin, User, Mail, Phone, Ticket } from 'lucide-react';

interface UserProfile {
    name: string;
    email: string;
    phone: string;
    bio: string;
    interests: string[];
    [key: string]: any;
}

const SERIAL_NUMBER_EVENT_ID = '6a17f0cfcea3b566702e86a9';

function shouldShowEventSerial(booking: any): boolean {
    const eventId =
        typeof booking?.event === 'string'
            ? booking.event
            : booking?.event?._id;
    return (
        String(eventId) === SERIAL_NUMBER_EVENT_ID &&
        typeof booking?.ticketSerialNumber === 'number'
    );
}

interface ModernBookingTicketProps {
    bookingId: string;
    ticketIndex?: number;
    totalTickets?: number;
    autoDownload?: boolean;
}

const ModernBookingTicket: React.FC<ModernBookingTicketProps> = ({
    bookingId,
    ticketIndex = 1,
    totalTickets = 1,
    autoDownload = false,
}) => {
    const [booking, setBooking] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [user, setUser] = useState<UserProfile | null>(null);
    const ticketRef = useRef<HTMLDivElement>(null);
    const [showVoucherPopup, setShowVoucherPopup] = useState(false);
    const [hasAutoDownloaded, setHasAutoDownloaded] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        if (
            booking &&
            booking.event._id === '68c2c33eb6ef88c76f50ce7c' &&
            booking.total * booking.totalTickets >= 4000 &&
            booking?.ticketIndex == 1 &&
            new Date(booking.bookedAt) >= new Date('2025-10-15T07:02:08.225+00:00')
        ) {
            setShowVoucherPopup(true);
        }
    }, [booking]);

    useEffect(() => {
        const fetchBookingAndProfileData = async () => {
            if (!bookingId) return;
            setLoading(true);
            setError('');
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setError('Authentication token not found. Please log in.');
                    setLoading(false);
                    return;
                }
                const bookingRes = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/bookings/${bookingId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (!bookingRes.ok) {
                    const errorData = await bookingRes.json();
                    throw new Error(errorData.message || 'Failed to fetch booking details.');
                }
                const bookingData = await bookingRes.json();
                setBooking(bookingData.data);

                const profileRes = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/auth/profile`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (profileRes.ok) {
                    const profileData = await profileRes.json();
                    setUser(profileData.data.user);
                }
            } catch (err: any) {
                setError(err.message || 'An unknown error occurred.');
            } finally {
                setLoading(false);
            }
        };
        fetchBookingAndProfileData();
    }, [bookingId]);

    useEffect(() => {
        if (!autoDownload || loading || !booking || hasAutoDownloaded) return;
        const runAutoDownload = async () => {
            await handleDownloadTicket();
            setHasAutoDownloaded(true);
        };
        runAutoDownload();
    }, [autoDownload, loading, booking, hasAutoDownloaded]);

    const formatDate = (date: string | number | Date) =>
        new Date(date).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });

    const formatDateShort = (date: string | number | Date) =>
        new Date(date).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });

    const formatTime = (date: string | number | Date) =>
        new Date(date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

    const getEndTime = (booking: any) => {
        const end = booking.event?.endDate || booking.event?.endTime || booking.endTime;
        if (end) return formatTime(end);
        const start = new Date(booking.event?.startDate || booking.event?.startTime || booking.startTime);
        start.setHours(start.getHours() + 2);
        return formatTime(start);
    };

    const handleDownloadTicket = async () => {
        if (!ticketRef.current) return;
        setIsDownloading(true);

        try {
            const html2canvas = (await import('html2canvas')).default;
            const jsPDF = (await import('jspdf')).default;

            // Wait for QR image to fully load
            await new Promise((resolve) => setTimeout(resolve, 500));

            const element = ticketRef.current;

            const canvas = await html2canvas(element, {
                scale: 3,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false,
                scrollX: 0,
                scrollY: 0,
                width: element.scrollWidth,
                height: element.scrollHeight,
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight,
                onclone: (clonedDoc: Document) => {
                    const clonedEl = clonedDoc.querySelector('[data-ticket-root]') as HTMLElement;
                    if (clonedEl) {
                        clonedEl.style.width = `${element.scrollWidth}px`;
                        clonedEl.style.maxWidth = 'none';
                        clonedEl.style.margin = '0';
                    }
                },
            });

            const imgData = canvas.toDataURL('image/png', 1.0);

            // A4 portrait
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pageW = pdf.internal.pageSize.getWidth();  // 210
            const pageH = pdf.internal.pageSize.getHeight(); // 297

            const margin = 12;
            const maxImgW = pageW - margin * 2;
            const maxImgH = pageH - margin * 2;

            const imgAspect = canvas.width / canvas.height;
            let imgW = maxImgW;
            let imgH = imgW / imgAspect;

            if (imgH > maxImgH) {
                imgH = maxImgH;
                imgW = imgH * imgAspect;
            }

            const xOffset = (pageW - imgW) / 2;
            const yOffset = (pageH - imgH) / 2;

            pdf.addImage({
                imageData: imgData,
                x: xOffset,
                y: yOffset,
                width: imgW,
                height: imgH,
                compression: 'FAST',
            });

            const showEventSerial = shouldShowEventSerial(booking);
            const footerText = showEventSerial
                ? `Serial No: ${booking.ticketSerialNumber}`
                : `Ticket ID: ${booking?._id || 'N/A'}_ticket_${booking?.ticketIndex || ticketIndex}`;

            pdf.setFontSize(7);
            pdf.setTextColor(150, 150, 150);
            const textW = pdf.getStringUnitWidth(footerText) * 7 / pdf.internal.scaleFactor;
            pdf.text(footerText, (pageW - textW) / 2, pageH - 4);

            const eventName =
                booking?.event?.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'ticket';
            const fileName = showEventSerial
                ? `${eventName}_serial_${booking.ticketSerialNumber}.pdf`
                : `${eventName}_ticket_${booking?.ticketIndex || ticketIndex}_of_${booking?.totalTickets || totalTickets}_${booking?._id?.slice(-6) || Date.now()}.pdf`;

            pdf.save(fileName);
        } catch (err) {
            console.error('Error generating PDF:', err);
            alert('Failed to download ticket. Please try again.');
        } finally {
            setIsDownloading(false);
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, fontFamily: 'sans-serif', color: '#6B7280' }}>
            Loading ticket…
        </div>
    );
    if (error) return (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#EF4444', fontFamily: 'sans-serif' }}>{error}</div>
    );
    if (!booking) return null;

    const showEventSerial = shouldShowEventSerial(booking);

    const startDate = booking.event?.startDate || booking.event?.startTime || booking.startTime;
    const displayName = booking.user?.name || user?.name || '—';
    const displayEmail = booking.user?.email || user?.email || '—';
    const displayPhone = booking.user?.phone || user?.phone || '—';
    const eventLocation = booking.event?.location?.address || booking.event?.venue || '—';

    const ticketBenefits = (() => {
        const t = booking.event?.ticketTypes?.find((t: any) => t.name === booking.ticketType);
        return t?.benefits?.length ? t.benefits : [];
    })();

    // Build QR data
    const rawDataObject = {
        bookingId: booking._id,
        bookingCode: booking.bookingCode,
        name: displayName,
        email: displayEmail,
        phone: displayPhone,
        event: booking.event?.title,
        ticketType: booking.ticketType,
        ticketIndex: booking.ticketIndex || ticketIndex,
        totalTickets: booking.totalTickets || totalTickets,
        ...(showEventSerial && { ticketSerialNumber: booking.ticketSerialNumber }),
        pricePerTicket: formatCurrency(booking.price),
        total: formatCurrency(booking.total),
        ticketId: showEventSerial
            ? `SN-${booking.ticketSerialNumber}`
            : `${booking._id}_ticket_${booking.ticketIndex || ticketIndex}`,
    };
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(JSON.stringify(rawDataObject))}&size=180x180&margin=8`;

    const ticketId = showEventSerial
        ? `SN-${booking.ticketSerialNumber}`
        : `${booking._id}_ticket_${booking.ticketIndex || ticketIndex}`;

    return (
        <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 520, margin: '2rem auto', padding: '0 1rem' }}>

            {/* Voucher Popup */}
            {showVoucherPopup && (
                <div
                    onClick={() => setShowVoucherPopup(false)}
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#fff', borderRadius: 20, padding: '2rem', maxWidth: 360,
                            width: '90%', textAlign: 'center', position: 'relative', overflow: 'hidden',
                        }}
                    >
                        <div style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, background: 'linear-gradient(135deg,#f472b6,#818cf8)', borderRadius: '50%', opacity: 0.25 }} />
                        <div style={{ position: 'absolute', bottom: -40, left: -40, width: 120, height: 120, background: 'linear-gradient(135deg,#818cf8,#f472b6)', borderRadius: '50%', opacity: 0.25 }} />
                        <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
                        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: '#111827' }}>Congratulations!</h2>
                        <img src="/images/Madame_(clothing).svg.png" alt="Madame Logo" style={{ width: '50%', height: 'auto', margin: '0 auto 16px' }} />
                        <p style={{ fontSize: 14, color: '#374151', marginBottom: 12 }}>
                            You have got a <strong style={{ color: '#059669' }}>₹2,000 Madame Shopping Voucher</strong>! Redeem at any Madame Store PAN India within <strong style={{ color: '#D97706' }}>6 months</strong> of issue.
                        </p>
                        <p style={{ fontSize: 13, color: '#374151', marginBottom: 16 }}>Contact <strong style={{ color: '#4F46E5' }}>8730986585</strong> to claim.</p>
                        <button
                            onClick={() => setShowVoucherPopup(false)}
                            style={{
                                background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', color: '#fff',
                                border: 'none', borderRadius: 12, padding: '12px 32px',
                                fontWeight: 700, fontSize: 15, cursor: 'pointer',
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* ── TICKET ── */}
            <div
                ref={ticketRef}
                data-ticket-root
                style={{
                    background: '#fff',
                    borderRadius: 20,
                    boxShadow: '0 8px 40px rgba(79,70,229,0.15)',
                    overflow: 'hidden',
                }}
            >
                {/* ── HEADER ── */}
                <div style={{
                    background: 'linear-gradient(135deg, #312e81 0%, #4F46E5 45%, #7C3AED 75%, #db2777 100%)',
                    padding: '28px 28px 24px',
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    {/* Decorative circles */}
                    <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, background: 'rgba(255,255,255,0.08)', borderRadius: '50%' }} />
                    <div style={{ position: 'absolute', bottom: -30, left: -30, width: 100, height: 100, background: 'rgba(255,255,255,0.06)', borderRadius: '50%' }} />

                    <div style={{ position: 'relative', zIndex: 1 }}>
                        {/* Logo row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <img src="/images/Logo.png" alt="Logo" style={{ height: 28, width: 'auto', filter: 'brightness(0) invert(1)' }} />
                            <div style={{
                                background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)',
                                borderRadius: 20, padding: '4px 14px',
                                color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase',
                            }}>
                                Confirmed ✓
                            </div>
                        </div>

                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 500, marginBottom: 4, letterSpacing: 0.5 }}>
                            BOOKING CONFIRMED FOR
                        </p>
                        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: '0 0 16px', lineHeight: 1.2 }}>
                            {booking.event?.title || 'Event Title'}
                        </h1>

                        {/* Date + Location chips */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                background: 'rgba(255,255,255,0.15)', borderRadius: 20,
                                padding: '6px 14px', color: '#fff', fontSize: 13,
                            }}>
                                <Calendar size={14} />
                                {formatDateShort(startDate)}
                            </div>
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                background: 'rgba(255,255,255,0.15)', borderRadius: 20,
                                padding: '6px 14px', color: '#fff', fontSize: 13,
                            }}>
                                <Clock size={14} />
                                {formatTime(startDate)} – {getEndTime(booking)}
                            </div>
                            {eventLocation !== '—' && (
                                <div style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    background: 'rgba(255,255,255,0.15)', borderRadius: 20,
                                    padding: '6px 14px', color: '#fff', fontSize: 13,
                                }}>
                                    <MapPin size={14} />
                                    {eventLocation}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── TEAR EDGE ── */}
                <div style={{ position: 'relative', height: 0, margin: '0' }}>
                    <div style={{
                        position: 'absolute', left: -12, top: -12,
                        width: 24, height: 24, background: '#f3f4f6', borderRadius: '50%', zIndex: 2,
                    }} />
                    <div style={{
                        position: 'absolute', right: -12, top: -12,
                        width: 24, height: 24, background: '#f3f4f6', borderRadius: '50%', zIndex: 2,
                    }} />
                    <div style={{
                        borderTop: '2px dashed #e5e7eb', margin: '0 12px',
                    }} />
                </div>

                {/* ── BODY ── */}
                <div style={{ padding: '28px 28px 0' }}>

                    {/* ── TICKET TYPE ROW ── */}
                    <div style={{
                        background: 'linear-gradient(135deg, #eef2ff, #f5f3ff)',
                        border: '1px solid #c7d2fe',
                        borderRadius: 14,
                        padding: '18px 20px',
                        marginBottom: 20,
                        textAlign: 'center',
                    }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>
                            Ticket Type
                        </p>
                        <h2 style={{ fontSize: 28, fontWeight: 900, color: '#3730a3', margin: '0 0 8px' }}>
                            {booking.ticketType}
                        </h2>

                        {/* {showEventSerial && (
                            <div style={{
                                display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
                                border: '2px solid #a5b4fc', borderRadius: 12, padding: '8px 24px',
                                background: '#fff', marginBottom: 8,
                            }}>
                                <p style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', letterSpacing: 1.5, textTransform: 'uppercase', margin: '0 0 2px' }}>
                                    Serial Number
                                </p>
                                <p style={{ fontSize: 36, fontWeight: 900, color: '#1e1b4b', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                                    {booking.ticketSerialNumber}
                                </p>
                            </div>
                        )} */}

                        {ticketBenefits.length > 0 && (
                            <p style={{ fontSize: 13, color: '#0d9488', fontWeight: 600, margin: '4px 0 0' }}>
                                {ticketBenefits.slice(0, 2).join(' · ')}
                            </p>
                        )}

                        {(booking.totalTickets || totalTickets) > 1 && (
                            <div style={{
                                marginTop: 8, display: 'inline-block',
                                background: '#e0e7ff', borderRadius: 20, padding: '4px 14px',
                                fontSize: 13, color: '#4338ca', fontWeight: 600,
                            }}>
                                Ticket {booking.ticketIndex || ticketIndex} of {booking.totalTickets || totalTickets}
                            </div>
                        )}
                    </div>

                    {/* ── ATTENDEE DETAILS ── */}
                    <div style={{ marginBottom: 20 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 }}>
                            Attendee Details
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <DetailRow icon={<User size={14} />} label="Name" value={displayName} />
                            <DetailRow icon={<Mail size={14} />} label="Email" value={displayEmail} />
                            <DetailRow icon={<Phone size={14} />} label="Phone" value={displayPhone} />
                            <DetailRow icon={<Ticket size={14} />} label="Ticket Price" value={formatCurrency(booking.price)} highlight />
                        </div>
                    </div>

                    {/* Payment badge */}
                    {booking.payment && (
                        <div style={{
                            background: '#f0fdf4', border: '1px solid #86efac',
                            borderRadius: 10, padding: '10px 16px',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            marginBottom: 20,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <CreditCard size={16} color="#16a34a" />
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#15803d' }}>Payment Successful</span>
                            </div>
                            <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#16a34a', fontWeight: 600 }}>
                                {booking.payment.transactionId}
                            </span>
                        </div>
                    )}
                </div>

                {/* ── TEAR EDGE 2 ── */}
                <div style={{ position: 'relative', margin: '0 0' }}>
                    <div style={{ borderTop: '2px dashed #e5e7eb', margin: '0 28px' }} />
                    <div style={{
                        position: 'absolute', left: 4, top: -12,
                        width: 24, height: 24, background: '#f3f4f6', borderRadius: '50%',
                    }} />
                    <div style={{
                        position: 'absolute', right: 4, top: -12,
                        width: 24, height: 24, background: '#f3f4f6', borderRadius: '50%',
                    }} />
                </div>

                {/* ── QR + ID SECTION ── */}
                <div style={{
                    background: '#fafafa',
                    padding: '24px 28px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 24,
                }}>
                    {/* QR Code */}
                    <div style={{
                        border: '3px solid #e0e7ff',
                        borderRadius: 12,
                        padding: 6,
                        background: '#fff',
                        flexShrink: 0,
                    }}>
                        <img
                            src={qrUrl}
                            alt="Booking QR Code"
                            width={150}
                            height={150}
                            crossOrigin="anonymous"
                        />
                    </div>

                    {/* Right side info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#6366f1', marginBottom: 4 }}>
                            Scan for Entry
                        </p>
                        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 14, lineHeight: 1.5 }}>
                            Present this QR code at <strong style={{ color: '#374151' }}>{eventLocation !== '—' ? eventLocation : 'the venue'}</strong>
                        </p>

                        {/* Ticket ID box */}
                        <div style={{
                            background: '#fff',
                            border: '1px solid #e0e7ff',
                            borderRadius: 8,
                            padding: '8px 12px',
                            marginBottom: 10,
                        }}>
                            <p style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 2px' }}>
                                {showEventSerial ? 'Serial Number' : 'Ticket ID'}
                            </p>
                            <p style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#1e1b4b', margin: 0, wordBreak: 'break-all' }}>
                                {showEventSerial ? booking.ticketSerialNumber : ticketId}
                            </p>
                        </div>

                        {/* Booked on */}
                        <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
                            Booked on {formatDateShort(booking.bookedAt)}
                        </p>
                    </div>
                </div>

                {/* ── FOOTER / DOWNLOAD ── */}
                <div style={{ padding: '16px 28px 24px', background: '#f9fafb', borderTop: '1px solid #f3f4f6' }}>
                    <button
                        onClick={handleDownloadTicket}
                        disabled={isDownloading}
                        style={{
                            width: '100%',
                            background: isDownloading
                                ? '#93c5fd'
                                : 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 12,
                            padding: '14px 20px',
                            fontWeight: 700,
                            fontSize: 15,
                            cursor: isDownloading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            transition: 'opacity 0.2s',
                        }}
                    >
                        <DownloadIcon size={18} />
                        {isDownloading ? 'Generating PDF…' : 'Download Ticket'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Helper sub-component ──
const DetailRow: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string;
    highlight?: boolean;
}> = ({ icon, label, value, highlight }) => (
    <div style={{
        background: highlight ? '#f0fdf4' : '#f9fafb',
        border: `1px solid ${highlight ? '#86efac' : '#f3f4f6'}`,
        borderRadius: 10,
        padding: '10px 12px',
    }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, color: highlight ? '#16a34a' : '#6b7280' }}>
            {icon}
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', margin: 0, color: 'inherit' }}>
                {label}
            </p>
        </div>
        <p style={{ fontSize: 13, fontWeight: 700, color: highlight ? '#15803d' : '#111827', margin: 0, wordBreak: 'break-word' }}>
            {value}
        </p>
    </div>
);

export default ModernBookingTicket;