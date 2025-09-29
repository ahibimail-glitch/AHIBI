import { useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const ProductShowcase = () => {
    const products = [
        {
            id: "71947811847165801",
            name: "Melita Ultra Hydrating Essence",
            originalPrice: "₹1,499.00",
            salePrice: "₹1,199.00",
            image: "/melita/product1.jpg",
            details:
                "Meet Melita Ultra Hydrating Essence. A featherlight essence powered by Squalane, Hyaluronic Acid, and Peptides to deeply hydrate, strengthen your skin barrier, and prep your skin for actives. Clinically shown to boost hydration by up to 400%. Healthy skin starts with a strong, resilient barrier.",
        },
        {
            id: "71947811847165802",
            name: "Melita Ultra Protecting Sunscreen",
            originalPrice: "₹1,450.00",
            salePrice: "₹1,299.00",
            image: "/melita/product2.jpg",
            details:
                "Your daily skin shield. Meet your new favourite sun shield. This SPF 50+ PA++++ sunscreen blends into your skin within seconds, leaving no white cast and a beautiful, glass-like glow. Its gel-cream texture is refreshing and cooling, making application feel like a treat—not a chore. Infused with powerful antioxidants, it helps protect your skin from UV rays, pollution, and everyday environmental stressors—so you stay radiant and resilient, wherever life takes you. Lightweight, nourishing, and virtually invisible—this is protection you'll want to wear every single day.",
        },
        {
            id: "71947811847165803",
            name: "Melita Oily Skin Daily Essentials",
            originalPrice: "₹3,324.00",
            salePrice: "₹2,593.00",
            image: "/melita/product3.jpg",
            details:
                "Light on skin. Strong on results. This 3-step routine is designed to gently cleanse, deeply hydrate, and invisibly protect oily or acne-prone skin—all without heaviness, stickiness, or residue. Start with the Renewing Cleanser, a soap-free gel that foams just enough to lift away excess oil, buildup, and light makeup without disrupting your skin barrier. Follow with the Ultra Hydrating Essence, a featherlight formula that boosts hydration by up to 400%, helping to balance oil production and soothe skin. Finish with the Ultra Protecting Sunscreen, a fragrance-free gel-cream with SPF 50+ that absorbs quickly, leaves no white cast, and protects against sun and screen damage. Together, they help oily skin stay fresh, calm, and protected—without weighing it down.",
        },
        {
            id: "71947811847165804",
            name: "Melita Barrier Care Starter Duo",
            originalPrice: "₹1,874.00",
            salePrice: "₹1,499.00",
            image: "/melita/product4.jpg",
            details:
                "A Simple Start to Healthy Skin. Start strong with two foundational steps designed to reset your skin and support long-term health. The Renewing Cleanser is a soap-free gel that gently foams to remove dirt, oil, and light makeup without drying or stripping your skin barrier. It leaves your face clean, calm, and ready for hydration. Follow up with the Ultra Hydrating Essence, a water-light formula powered by Squalane, Hyaluronic Acid, and Peptides. Clinically shown to boost hydration by up to 400%, it absorbs instantly and preps your skin to get more from every step that follows. Together, they rebalance, hydrate, and strengthen your skin from the very first use.",
        },
    ];

    const sliderRef = useRef<HTMLDivElement | null>(null);

    const scrollLeft = () => {
        if (sliderRef.current) {
            const scrollAmount = window.innerWidth < 640 ? 260 : 280;
            sliderRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        }
    };

    const scrollRight = () => {
        if (sliderRef.current) {
            const scrollAmount = window.innerWidth < 640 ? 260 : 280;
            sliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    return (
        <section id="products" className="w-full overflow-hidden">
            <div className="my-4 sm:my-6 md:my-14 px-4">
                <h2 className="text-[#1e4323] text-center text-lg sm:text-xl md:text-2xl lg:text-3xl font-headingOne font-semibold leading-snug uppercase">
                    Take A Step Towards A Healthy Skin
                </h2>
            </div>

            <div className="relative px-2 sm:px-4 lg:px-10">
                {/* Product Slider */}
                <div
                    ref={sliderRef}
                    className="overflow-x-auto flex justify-start sm:justify-center snap-x snap-mandatory gap-3 sm:gap-4 md:gap-6 py-4 sm:py-6 scroll-smooth scrollbar-hide"
                    style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        WebkitOverflowScrolling: 'touch'
                    }}
                >
                    {products.map((product, index) => (
                        <div key={index} className="flex-none w-[280px] sm:w-[300px] md:w-[320px] snap-center first:ml-2 sm:first:ml-0 last:mr-2 sm:last:mr-0">
                            <div className="relative group w-full overflow-hidden rounded-lg sm:rounded-xl shadow-lg sm:shadow-xl bg-[#f0e4d4] border border-gray-200">
                                <a href="#" className="block relative h-72 sm:h-80 md:h-96 overflow-hidden">
                                    <img
                                        src={product.image}
                                        loading="lazy"
                                        alt={product.name}
                                        className="w-full h-full object-cover"
                                    />

                                    {/* Hover Add to Bag (Desktop only) */}
                                    <div className="hidden sm:block absolute top-[90%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-all duration-500">
                                        <Link href={`/melita/details/${product.id}`} passHref>
                                            <button
                                                type="button"
                                                className="bg-[#835339] text-white font-headingTwo font-semibold rounded-sm text-sm md:text-base px-12 md:px-16 py-2 transition-all whitespace-nowrap shadow-md hover:bg-white hover:text-[#835339] hover:border border-[#835339]"
                                            >
                                                BUY NOW
                                            </button>
                                        </Link>
                                    </div>
                                </a>

                                {/* Product Info */}
                                <div className="p-2 sm:p-3 space-y-1 text-center bg-[#f0e4d4] min-h-[120px] sm:min-h-[140px] flex flex-col justify-center">
                                    <h3 className="text-base sm:text-lg font-headingTwo font-bold text-gray-900 line-clamp-2 px-2">
                                        {product.name}
                                    </h3>
                                    <div className="pt-1 sm:pt-2 flex flex-col items-center">
                                        <span className="text-base sm:text-lg line-through text-gray-400">
                                            {product.originalPrice}
                                        </span>
                                        <span className="text-[#835339] text-base sm:text-md font-headingTwo font-bold">
                                            {product.salePrice}
                                        </span>
                                    </div>
                                </div>

                                {/* Add to Bag (Mobile only) */}
                                <div className="block sm:hidden px-3 pb-4 bg-[#f0e4d4]">
                                    <Link href={`/melita/details/${product.id}`} passHref>
                                        <button
                                            type="button"
                                            className="w-full block text-center bg-white font-headingTwo font-semibold rounded-sm text-sm px-6 py-2.5 transition-all shadow-md text-[#835339] border border-[#835339] active:bg-[#835339] active:text-white"
                                        >
                                            BUY NOW
                                        </button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Navigation Arrows (Desktop only) */}
                <button
                    onClick={scrollLeft}
                    className="hidden lg:flex absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg z-10 items-center justify-center transition-all"
                    aria-label="Scroll left"
                >
                    <ChevronLeft className="w-6 h-6 text-[#835339]" />
                </button>
                <button
                    onClick={scrollRight}
                    className="hidden lg:flex absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg z-10 items-center justify-center transition-all"
                    aria-label="Scroll right"
                >
                    <ChevronRight className="w-6 h-6 text-[#835339]" />
                </button>
            </div>
        </section>
    );
};

export default ProductShowcase;