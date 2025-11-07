import Footer from "@/app/Footer";
import Navbar from "@/app/Navbar";

const TermsMusic = () => {
    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <main className="container mx-auto px-4 sm:px-6  pb-20">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 gradient-text">
                            Terms & Conditions
                        </h1>
                        <p className="text-lg text-muted-foreground">
                            Hornbill Music Festival 2025
                        </p>
                    </div>

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

                        {/* Ticket Purchase & Entry */}
                        <section>
                            <h2 className="text-2xl font-bold mb-4 text-foreground">Ticket Purchase & Entry</h2>
                            <ul className="space-y-3 text-muted-foreground">
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Tickets are available online only at AHIBI.IN.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Limited offline tickets may be available at the venue.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Each ticket/pass admits one person only.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Tickets and passes are non-transferable once the QR code is scanned.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>No re-entry. Once you exit the venue, the ticket is considered used.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>No ticket upgrades are allowed at the venue.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Visitors must present a valid digital QR ticket for entry. Printed QR is optional.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Government-issued ID may be required for verification (domestic/international/local).</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Children below 7 years may enter free when accompanied by a paying adult.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Entry is subject to venue capacity, safety checks, and security protocols.</span>
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
                                    <span>No refunds for no-shows, travel issues, weather, or personal circumstances.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>If the event or a specific day is officially cancelled, refund instructions will be announced through official channels.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>In case of postponement, tickets remain valid for the new dates.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>No refunds for postponements.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Tickets cannot be exchanged or resold.</span>
                                </li>
                            </ul>
                        </section>

                        {/* Event Rules & Conduct */}
                        <section>
                            <h2 className="text-2xl font-bold mb-4 text-foreground">Event Rules & Conduct</h2>
                            <ul className="space-y-3 text-muted-foreground">
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Attendees must follow all security and event staff instructions.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Bags may be checked. Large bags or restricted items may be denied entry.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Prohibited items include weapons, illegal substances, fireworks, and outside alcohol.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Disorderly or disruptive behaviour may result in removal without refund.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Alcohol consumption is allowed only in designated areas where permitted.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Smoking is allowed only in designated zones (where applicable).</span>
                                </li>
                            </ul>
                        </section>

                        {/* Photography & Recording */}
                        <section>
                            <h2 className="text-2xl font-bold mb-4 text-foreground">Photography & Recording</h2>
                            <ul className="space-y-3 text-muted-foreground">
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Personal photography and mobile video recording are allowed.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Professional cameras, drones, and recording equipment require prior approval.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>By entering the venue, attendees consent to being filmed or photographed for festival documentation and promotional purposes.</span>
                                </li>
                            </ul>
                        </section>

                        {/* Liability */}
                        <section>
                            <h2 className="text-2xl font-bold mb-4 text-foreground">Liability</h2>
                            <ul className="space-y-3 text-muted-foreground">
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Attendees enter at their own risk. The organizers and AHIBI are not responsible for injury, illness, or property damage.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Organizers and AHIBI are not responsible for lost, stolen, or damaged belongings.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>The event schedule, lineup, timings, and programming are subject to change without prior notice.</span>
                                </li>
                            </ul>
                        </section>

                        {/* Digital Policy */}
                        <section>
                            <h2 className="text-2xl font-bold mb-4 text-foreground">Digital Policy</h2>
                            <ul className="space-y-3 text-muted-foreground">
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Do not share your ticket or QR code publicly.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Misuse or duplication may result in denial of entry.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>Any fraudulent activity may lead to cancellation without refund and legal action.</span>
                                </li>
                            </ul>
                        </section>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default TermsMusic;