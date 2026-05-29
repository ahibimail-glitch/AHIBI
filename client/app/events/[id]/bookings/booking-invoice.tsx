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
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
        });

    const formatDateShort = (date: string | number | Date) =>
        new Date(date).toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
        });

    const formatTime = (date: string | number | Date) =>
        new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

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
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            const margin = 12;
            const maxImgW = pageW - margin * 2;
            const maxImgH = pageH - margin * 2;
            const imgAspect = canvas.width / canvas.height;
            let imgW = maxImgW;
            let imgH = imgW / imgAspect;
            if (imgH > maxImgH) { imgH = maxImgH; imgW = imgH * imgAspect; }
            const xOffset = (pageW - imgW) / 2;
            const yOffset = (pageH - imgH) / 2;
            pdf.addImage({ imageData: imgData, x: xOffset, y: yOffset, width: imgW, height: imgH, compression: 'FAST' });
            const showEventSerial = shouldShowEventSerial(booking);
            const footerText = showEventSerial
                ? `Serial No: ${booking.ticketSerialNumber}`
                : `Ticket ID: ${booking?._id || 'N/A'}_ticket_${booking?.ticketIndex || ticketIndex}`;
            pdf.setFontSize(7);
            pdf.setTextColor(150, 150, 150);
            const textW = pdf.getStringUnitWidth(footerText) * 7 / pdf.internal.scaleFactor;
            pdf.text(footerText, (pageW - textW) / 2, pageH - 4);
            const eventName = booking?.event?.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'ticket';
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
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(JSON.stringify(rawDataObject))}&size=160x160&margin=6`;
    const ticketId = showEventSerial
        ? `SN-${booking.ticketSerialNumber}`
        : `${booking._id}_ticket_${booking.ticketIndex || ticketIndex}`;

    return (
        <>
            <style>{`
                .mbt-wrap {
                    font-family: 'Segoe UI', system-ui, sans-serif;
                    width: 100%;
                    max-width: 440px;
                    margin: 0 auto;
                    padding: 12px;
                    box-sizing: border-box;
                }
                .mbt-ticket {
                    background: #fff;
                    border-radius: 18px;
                    box-shadow: 0 6px 32px rgba(79,70,229,0.14);
                    overflow: hidden;
                    width: 100%;
                }
                /* HEADER */
                .mbt-header {
                    background: linear-gradient(135deg, #312e81 0%, #4F46E5 45%, #7C3AED 75%, #db2777 100%);
                    padding: 20px 20px 18px;
                    position: relative;
                    overflow: hidden;
                }
                .mbt-header-circle1 {
                    position: absolute; top: -35px; right: -35px;
                    width: 120px; height: 120px;
                    background: rgba(255,255,255,0.08); border-radius: 50%;
                }
                .mbt-header-circle2 {
                    position: absolute; bottom: -25px; left: -25px;
                    width: 90px; height: 90px;
                    background: rgba(255,255,255,0.06); border-radius: 50%;
                }
                .mbt-header-inner { position: relative; z-index: 1; }
                .mbt-logo-row {
                    display: flex; justify-content: space-between; align-items: center;
                    margin-bottom: 14px;
                }
                .mbt-logo { height: 24px; width: auto; filter: brightness(0) invert(1); }
                .mbt-confirmed-badge {
                    background: rgba(255,255,255,0.2);
                    backdrop-filter: blur(4px);
                    border-radius: 20px; padding: 4px 12px;
                    color: #fff; font-size: 10px; font-weight: 700;
                    letter-spacing: 1.2px; text-transform: uppercase;
                }
                .mbt-header-label {
                    color: rgba(255,255,255,0.7); font-size: 10px;
                    font-weight: 600; margin: 0 0 3px; letter-spacing: 0.5px;
                }
                .mbt-event-title {
                    color: #fff; font-size: 20px; font-weight: 800;
                    margin: 0 0 12px; line-height: 1.2;
                }
                .mbt-chips {
                    display: flex; flex-wrap: wrap; gap: 7px;
                }
                .mbt-chip {
                    display: inline-flex; align-items: center; gap: 5px;
                    background: rgba(255,255,255,0.15); border-radius: 20px;
                    padding: 5px 11px; color: #fff; font-size: 11px; font-weight: 500;
                }
                /* TEAR */
                .mbt-tear {
                    position: relative; height: 0;
                }
                .mbt-tear-dot-l, .mbt-tear-dot-r {
                    position: absolute;
                    width: 22px; height: 22px;
                    background: #f3f4f6; border-radius: 50%; z-index: 2;
                    top: -11px;
                }
                .mbt-tear-dot-l { left: -11px; }
                .mbt-tear-dot-r { right: -11px; }
                .mbt-tear-line {
                    border-top: 2px dashed #e5e7eb; margin: 0 11px;
                }
                /* BODY */
                .mbt-body { padding: 18px 18px 0; }
                /* TICKET TYPE */
                .mbt-type-box {
                    background: linear-gradient(135deg, #eef2ff, #f5f3ff);
                    border: 1px solid #c7d2fe;
                    border-radius: 12px; padding: 14px 16px;
                    margin-bottom: 16px; text-align: center;
                }
                .mbt-type-label {
                    font-size: 10px; font-weight: 700; color: #6366f1;
                    letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 3px;
                }
                .mbt-type-name {
                    font-size: 22px; font-weight: 900; color: #3730a3; margin: 0 0 6px;
                }
                .mbt-benefits {
                    font-size: 12px; color: #0d9488; font-weight: 600; margin: 3px 0 0;
                }
                .mbt-ticket-count {
                    display: inline-block; margin-top: 7px;
                    background: #e0e7ff; border-radius: 20px; padding: 3px 12px;
                    font-size: 12px; color: #4338ca; font-weight: 600;
                }
                /* ATTENDEE GRID */
                .mbt-section-label {
                    font-size: 10px; font-weight: 700; color: #9ca3af;
                    letter-spacing: 1.1px; text-transform: uppercase; margin-bottom: 10px;
                }
                .mbt-details-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 9px;
                    margin-bottom: 14px;
                }
                @media (max-width: 360px) {
                    .mbt-details-grid { grid-template-columns: 1fr; }
                }
                .mbt-detail-row {
                    border-radius: 9px; padding: 9px 10px;
                }
                .mbt-detail-row-icon-label {
                    display: flex; align-items: center; gap: 5px;
                    margin-bottom: 3px;
                }
                .mbt-detail-row-label {
                    font-size: 9px; font-weight: 700; letter-spacing: 0.9px;
                    text-transform: uppercase; margin: 0;
                }
                .mbt-detail-row-value {
                    font-size: 12px; font-weight: 700; margin: 0; word-break: break-word;
                }
                /* PAYMENT */
                .mbt-payment {
                    background: #f0fdf4; border: 1px solid #86efac;
                    border-radius: 9px; padding: 9px 14px;
                    display: flex; align-items: center; justify-content: space-between;
                    margin-bottom: 16px; gap: 8px; flex-wrap: wrap;
                }
                .mbt-payment-left {
                    display: flex; align-items: center; gap: 6px;
                }
                .mbt-payment-label { font-size: 12px; font-weight: 600; color: #15803d; }
                .mbt-payment-txn { font-size: 10px; font-family: monospace; color: #16a34a; font-weight: 600; }
                /* TEAR 2 */
                .mbt-tear2 { position: relative; }
                .mbt-tear2-dot-l, .mbt-tear2-dot-r {
                    position: absolute;
                    width: 22px; height: 22px;
                    background: #f3f4f6; border-radius: 50%;
                    top: -11px;
                }
                .mbt-tear2-dot-l { left: 4px; }
                .mbt-tear2-dot-r { right: 4px; }
                .mbt-tear2-line {
                    border-top: 2px dashed #e5e7eb; margin: 0 18px;
                }
                /* QR SECTION */
                .mbt-qr-section {
                    background: #fafafa; padding: 18px;
                    display: flex; align-items: center; gap: 16px;
                }
                .mbt-qr-wrap {
                    border: 3px solid #e0e7ff; border-radius: 10px;
                    padding: 5px; background: #fff; flex-shrink: 0;
                }
                .mbt-qr-img { display: block; width: 110px; height: 110px; }
                .mbt-qr-right { flex: 1; min-width: 0; }
                .mbt-qr-scan-label { font-size: 11px; font-weight: 600; color: #6366f1; margin: 0 0 3px; }
                .mbt-qr-venue { font-size: 11px; color: #6b7280; margin: 0 0 10px; line-height: 1.4; }
                .mbt-ticket-id-box {
                    background: #fff; border: 1px solid #e0e7ff;
                    border-radius: 7px; padding: 7px 10px; margin-bottom: 8px;
                }
                .mbt-ticket-id-label {
                    font-size: 9px; color: #9ca3af; font-weight: 600;
                    letter-spacing: 0.9px; text-transform: uppercase; margin: 0 0 2px;
                }
                .mbt-ticket-id-value {
                    font-size: 11px; font-family: monospace; font-weight: 700;
                    color: #1e1b4b; margin: 0; word-break: break-all;
                }
                .mbt-booked-on { font-size: 10px; color: #9ca3af; margin: 0; }
                /* FOOTER */
                .mbt-footer {
                    padding: 14px 18px 18px;
                    background: #f9fafb; border-top: 1px solid #f3f4f6;
                }
                .mbt-download-btn {
                    width: 100%;
                    border: none; border-radius: 11px; padding: 13px 18px;
                    font-weight: 700; font-size: 14px; cursor: pointer;
                    display: flex; align-items: center; justify-content: center; gap: 7px;
                    transition: opacity 0.2s, transform 0.15s;
                    color: #fff;
                }
                .mbt-download-btn:not(:disabled):active { transform: scale(0.98); }
                /* VOUCHER POPUP */
                .mbt-popup-overlay {
                    position: fixed; inset: 0; background: rgba(0,0,0,0.5);
                    display: flex; align-items: center; justify-content: center; z-index: 50;
                    padding: 16px; box-sizing: border-box;
                }
                .mbt-popup {
                    background: #fff; border-radius: 18px; padding: 24px 20px;
                    max-width: 340px; width: 100%; text-align: center;
                    position: relative; overflow: hidden;
                }
                .mbt-popup-circle1 {
                    position: absolute; top: -35px; right: -35px;
                    width: 110px; height: 110px;
                    background: linear-gradient(135deg,#f472b6,#818cf8);
                    border-radius: 50%; opacity: 0.25;
                }
                .mbt-popup-circle2 {
                    position: absolute; bottom: -35px; left: -35px;
                    width: 110px; height: 110px;
                    background: linear-gradient(135deg,#818cf8,#f472b6);
                    border-radius: 50%; opacity: 0.25;
                }
                .mbt-popup-emoji { font-size: 36px; margin-bottom: 10px; }
                .mbt-popup-title { font-size: 20px; font-weight: 800; margin-bottom: 6px; color: #111827; }
                .mbt-popup-logo { width: 45%; height: auto; margin: 0 auto 14px; display: block; }
                .mbt-popup-text { font-size: 13px; color: #374151; margin-bottom: 10px; line-height: 1.5; }
                .mbt-popup-contact { font-size: 12px; color: #374151; margin-bottom: 14px; }
                .mbt-popup-btn {
                    background: linear-gradient(135deg,#4F46E5,#7C3AED); color: #fff;
                    border: none; border-radius: 11px; padding: 11px 28px;
                    font-weight: 700; font-size: 14px; cursor: pointer;
                }
            `}</style>

            <div className="mbt-wrap">
                {/* Voucher Popup */}
                {showVoucherPopup && (
                    <div className="mbt-popup-overlay" onClick={() => setShowVoucherPopup(false)}>
                        <div className="mbt-popup" onClick={(e) => e.stopPropagation()}>
                            <div className="mbt-popup-circle1" />
                            <div className="mbt-popup-circle2" />
                            <div className="mbt-popup-emoji">🎉</div>
                            <h2 className="mbt-popup-title">Congratulations!</h2>
                            <img src="/images/Madame_(clothing).svg.png" alt="Madame Logo" className="mbt-popup-logo" />
                            <p className="mbt-popup-text">
                                You have got a <strong style={{ color: '#059669' }}>₹2,000 Madame Shopping Voucher</strong>!
                                Redeem at any Madame Store PAN India within <strong style={{ color: '#D97706' }}>6 months</strong> of issue.
                            </p>
                            <p className="mbt-popup-contact">
                                Contact <strong style={{ color: '#4F46E5' }}>8730986585</strong> to claim.
                            </p>
                            <button className="mbt-popup-btn" onClick={() => setShowVoucherPopup(false)}>Close</button>
                        </div>
                    </div>
                )}

                {/* ── TICKET ── */}
                <div ref={ticketRef} data-ticket-root className="mbt-ticket">

                    {/* HEADER */}
                    <div className="mbt-header">
                        <div className="mbt-header-circle1" />
                        <div className="mbt-header-circle2" />
                        <div className="mbt-header-inner">
                            <div className="mbt-logo-row">
                                <img src="/images/Logo.png" alt="Logo" className="mbt-logo" />
                                <div className="mbt-confirmed-badge">Confirmed ✓</div>
                            </div>
                            <p className="mbt-header-label">BOOKING CONFIRMED FOR</p>
                            <h1 className="mbt-event-title">{booking.event?.title || 'Event Title'}</h1>
                            <div className="mbt-chips">
                                <div className="mbt-chip">
                                    <Calendar size={12} />
                                    {formatDateShort(startDate)}
                                </div>
                                <div className="mbt-chip">
                                    <Clock size={12} />
                                    {formatTime(startDate)} – {getEndTime(booking)}
                                </div>
                                {eventLocation !== '—' && (
                                    <div className="mbt-chip">
                                        <MapPin size={12} />
                                        {eventLocation}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* TEAR 1 */}
                    <div className="mbt-tear">
                        <div className="mbt-tear-dot-l" />
                        <div className="mbt-tear-dot-r" />
                        <div className="mbt-tear-line" />
                    </div>

                    {/* BODY */}
                    <div className="mbt-body">
                        {/* Ticket Type */}
                        <div className="mbt-type-box">
                            <p className="mbt-type-label">Ticket Type</p>
                            <h2 className="mbt-type-name">{booking.ticketType}</h2>
                            {ticketBenefits.length > 0 && (
                                <p className="mbt-benefits">{ticketBenefits.slice(0, 2).join(' · ')}</p>
                            )}
                            {(booking.totalTickets || totalTickets) > 1 && (
                                <div className="mbt-ticket-count">
                                    Ticket {booking.ticketIndex || ticketIndex} of {booking.totalTickets || totalTickets}
                                </div>
                            )}
                        </div>

                        {/* Attendee Details */}
                        <div>
                            <p className="mbt-section-label">Attendee Details</p>
                            <div className="mbt-details-grid">
                                <DetailRow icon={<User size={12} />} label="Name" value={displayName} />
                                <DetailRow icon={<Mail size={12} />} label="Email" value={displayEmail} />
                                <DetailRow icon={<Phone size={12} />} label="Phone" value={displayPhone} />
                                <DetailRow icon={<Ticket size={12} />} label="Price" value={formatCurrency(booking.price)} highlight />
                            </div>
                        </div>

                        {/* Payment */}
                        {booking.payment && (
                            <div className="mbt-payment">
                                <div className="mbt-payment-left">
                                    <CreditCard size={15} color="#16a34a" />
                                    <span className="mbt-payment-label">Payment Successful</span>
                                </div>
                                <span className="mbt-payment-txn">{booking.payment.transactionId}</span>
                            </div>
                        )}
                    </div>

                    {/* TEAR 2 */}
                    <div className="mbt-tear2">
                        <div className="mbt-tear2-dot-l" />
                        <div className="mbt-tear2-dot-r" />
                        <div className="mbt-tear2-line" />
                    </div>

                    {/* QR SECTION */}
                    <div className="mbt-qr-section">
                        <div className="mbt-qr-wrap">
                            <img src={qrUrl} alt="Booking QR Code" className="mbt-qr-img" crossOrigin="anonymous" />
                        </div>
                        <div className="mbt-qr-right">
                            <p className="mbt-qr-scan-label">Scan for Entry</p>
                            <p className="mbt-qr-venue">
                                Show at <strong style={{ color: '#374151' }}>
                                    {eventLocation !== '—' ? eventLocation : 'the venue'}
                                </strong>
                            </p>
                            <div className="mbt-ticket-id-box">
                                <p className="mbt-ticket-id-label">
                                    {showEventSerial ? 'Serial Number' : 'Ticket ID'}
                                </p>
                                <p className="mbt-ticket-id-value">
                                    {showEventSerial ? booking.ticketSerialNumber : ticketId}
                                </p>
                            </div>
                            <p className="mbt-booked-on">Booked {formatDateShort(booking.bookedAt)}</p>
                        </div>
                    </div>

                    {/* FOOTER */}
                    <div className="mbt-footer">
                        <button
                            className="mbt-download-btn"
                            onClick={handleDownloadTicket}
                            disabled={isDownloading}
                            style={{
                                background: isDownloading
                                    ? '#93c5fd'
                                    : 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                                cursor: isDownloading ? 'not-allowed' : 'pointer',
                            }}
                        >
                            <DownloadIcon size={16} />
                            {isDownloading ? 'Generating PDF…' : 'Download Ticket'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

// ── Helper sub-component ──
const DetailRow: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string;
    highlight?: boolean;
}> = ({ icon, label, value, highlight }) => (
    <div
        className="mbt-detail-row"
        style={{
            background: highlight ? '#f0fdf4' : '#f9fafb',
            border: `1px solid ${highlight ? '#86efac' : '#f3f4f6'}`,
        }}
    >
        <div
            className="mbt-detail-row-icon-label"
            style={{ color: highlight ? '#16a34a' : '#6b7280' }}
        >
            {icon}
            <p className="mbt-detail-row-label" style={{ color: 'inherit' }}>{label}</p>
        </div>
        <p className="mbt-detail-row-value" style={{ color: highlight ? '#15803d' : '#111827' }}>
            {value}
        </p>
    </div>
);

export default ModernBookingTicket;