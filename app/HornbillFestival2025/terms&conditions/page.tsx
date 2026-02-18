import Footer from "@/app/Footer";
import Navbar from "@/app/Navbar";
import { ScrollArea } from "@/components/ui/scroll-area";

const Terms = () => {
    return (
        <div className="min-h-screen bg-background">
            {/* <Navbar /> */}

            <main className="container mx-auto px-4 sm:px-6 pb-20">
                <div className="max-w-4xl mx-auto">
                    {/* <div className="text-center mb-12">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 gradient-text">
                            Terms & Conditions
                        </h1>
                        <p className="text-lg text-muted-foreground">
                            Hornbill Festival (Heritage Village) 2025
                        </p>
                    </div> */}

                    <div className="gradient-card border border-border/30 rounded-2xl p-8 md:p-12 space-y-8">
                        {/* Contact Info */}
                        <div className="bg-muted/30 rounded-xl p-6 border border-border/20">
                            <h2 className="text-xl font-bold mb-4 text-primary">AHIBI</h2>
                            <div className="space-y-2 text-sm text-muted-foreground">
                                <p>132B Darogapathar, Dimapur, Nagaland 797112</p>
                                <p>Email: CONNECT@AHIBI.IN</p>
                                <p>Phone: 7005727288, 8837402472</p>
                                <p>Website: WWW.AHIBI.IN</p>
                            </div>
                        </div>

                        {/* Ticketing & Entry */}
                        <section>
                            <h2 className="text-2xl font-bold mb-4 text-foreground">Ticketing & Entry</h2>
                            <ul className="space-y-3 text-muted-foreground">
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Tickets are available online exclusively at AHIBI.IN.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Limited offline tickets may be available at the venue.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Each ticket or pass admits one individual only.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>A valid digital QR ticket or printed QR must be presented for entry.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Same-day re-entry is allowed only with a valid wristband and original ticket/QR.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Passes and tickets are non-transferable once scanned at the entry gate.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Government-issued ID may be required to confirm local/domestic/international classification.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Children below 7 years may enter free with a supervising adult.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Visitors must follow gate entry procedures and security checks at all times.</span>
                                </li>
                            </ul>
                        </section>

                        {/* Refund & Cancellation */}
                        <section>
                            <h2 className="text-2xl font-bold mb-4 text-foreground">Refund & Cancellation Policy</h2>
                            <ul className="space-y-3 text-muted-foreground">
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>All tickets and passes are non-refundable.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span className="font-semibold">No refunds will be provided due to:</span>
                                </li>
                                <li className="flex items-start ml-6">
                                    <span className="text-primary mr-2">○</span>
                                    <span>Change of plans or schedule</span>
                                </li>
                                <li className="flex items-start ml-6">
                                    <span className="text-primary mr-2">○</span>
                                    <span>Travel delays</span>
                                </li>
                                <li className="flex items-start ml-6">
                                    <span className="text-primary mr-2">○</span>
                                    <span>Weather conditions</span>
                                </li>
                                <li className="flex items-start ml-6">
                                    <span className="text-primary mr-2">○</span>
                                    <span>Partial attendance or missed days</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>In case the festival is officially cancelled, refund instructions will be issued through authorized channels.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>In case of postponement, tickets will remain valid for the new dates. Refunds will not be issued for postponements.</span>
                                </li>
                            </ul>
                        </section>

                        {/* Venue Rules */}
                        <section>
                            <h2 className="text-2xl font-bold mb-4 text-foreground">Venue Rules</h2>
                            <ul className="space-y-3 text-muted-foreground">
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Attendees must wear their wristband at all times inside the venue.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Lost or broken wristbands will not be reissued.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Attendees are expected to maintain respectful behaviour toward performers, artisans, staff, and other visitors.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Organizers reserve the right to remove any individual for misconduct, without refund.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Smoking is permitted only in designated areas (if applicable).</span>
                                </li>
                            </ul>
                        </section>

                        {/* Photography & Recording */}
                        <section>
                            <h2 className="text-2xl font-bold mb-4 text-foreground">Photography & Recording</h2>
                            <ul className="space-y-3 text-muted-foreground">
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Personal photography and videography are permitted.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Professional cameras and recording equipment may require prior permission.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Visitors consent to festival photography and videography for documentation and promotional use.</span>
                                </li>
                            </ul>
                        </section>

                        {/* Safety & Liability */}
                        <section>
                            <h2 className="text-2xl font-bold mb-4 text-foreground">Safety & Liability</h2>
                            <ul className="space-y-3 text-muted-foreground">
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Visitors enter the venue at their own risk.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>The festival and AHIBI are not responsible for personal injury, theft, loss, or damage to property.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>The festival schedule, programs, and cultural performances are subject to change without prior notice.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Security screening may be conducted. Restricted items may be denied entry.</span>
                                </li>
                            </ul>
                        </section>

                        {/* Prohibited Items */}
                        <section>
                            <h2 className="text-2xl font-bold mb-4 text-foreground">Prohibited Items</h2>
                            <ul className="space-y-3 text-muted-foreground">
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Items such as weapons, explosives, drugs, and other dangerous objects are not allowed.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Security reserves the right to deny entry to any prohibited items.</span>
                                </li>
                            </ul>
                        </section>

                        {/* Digital Ticket Policy */}
                        <section>
                            <h2 className="text-2xl font-bold mb-4 text-foreground">Digital Ticket Policy</h2>
                            <ul className="space-y-3 text-muted-foreground">
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Do not share your ticket or QR online.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Any fraudulent or duplicated ticket will result in denied entry and may lead to legal action.</span>
                                </li>
                            </ul>
                        </section>
                    </div>
                </div>
            </main>

            {/* <Footer /> */}
        </div>
    );
};

export default Terms;
