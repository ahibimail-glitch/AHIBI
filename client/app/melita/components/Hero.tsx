import { ChevronLeft, ChevronRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

const Hero = () => {
  const slides = [
    { desktop: "/melita/hero_banner_1.jpg", mobile: "/melita/mob_hero_banner_1.jpg", alt: "Hero Banner 1" },
    { desktop: "/melita/hero_banner_2.jpg", mobile: "/melita/mob_hero_banner_2.jpg", alt: "Hero Banner 2" },
    { desktop: "/melita/hero_banner_3.jpg", mobile: "/melita/mob_hero_banner_3.jpg", alt: "Hero Banner 3" },
  ];

  return (
    <section className="hero relative w-full">
      {/* Desktop Swiper */}
      <div className="hidden md:block h-[550px]">
        <Swiper
          modules={[Navigation, Pagination, Autoplay]}
          navigation={{
            nextEl: ".desktop-next",
            prevEl: ".desktop-prev",
          }}
          pagination={{
            clickable: true,
            el: ".desktop-pagination",
            bulletClass:
              "swiper-pagination-bullet w-3 h-3 bg-white/70 rounded-full mx-1 transition-all duration-300",
            bulletActiveClass:
              "swiper-pagination-bullet-active bg-[#8b5134] w-4 h-4",
          }}
          autoplay={{ delay: 4000, disableOnInteraction: false }}
          loop={true}
          className="w-full h-full"
        >
          {slides.map((slide, idx) => (
            <SwiperSlide key={idx} className="relative flex justify-center items-center">
              <img
                src={slide.desktop}
                alt={slide.alt}
                className="w-full h-full object-cover"
              />

              {/* Discount Banner Overlay */}
              <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-[#f0e4d4]/90 border border-[#835339]/40 rounded-lg shadow-md px-6 py-3 text-center">
                <h2 className="text-[#1e4323] text-sm sm:text-base md:text-lg lg:text-xl font-headingOne font-semibold uppercase tracking-wide">
                  Use Code: <span className="bg-[#835339] text-white px-2 py-1 rounded-md">MELITA50</span> for 50% OFF on Ahibi Fest Tickets
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-gray-700 italic">Limited Time Offer</p>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Desktop Controls */}
        <button className="desktop-prev absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/70 hover:bg-white rounded-full p-3 shadow-lg">
          <ChevronLeft className="w-6 h-6 text-[#8b5134]" />
        </button>
        <button className="desktop-next absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/70 hover:bg-white rounded-full p-3 shadow-lg">
          <ChevronRight className="w-6 h-6 text-[#8b5134]" />
        </button>
        <div className="desktop-pagination absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-2"></div>
      </div>

      {/* Mobile Swiper */}
      <div className="md:hidden h-[550px]">
        <Swiper
          modules={[Navigation, Pagination, Autoplay]}
          pagination={{
            clickable: true,
            el: ".mobile-pagination",
            bulletClass:
              "swiper-pagination-bullet w-2.5 h-2.5 bg-white/70 rounded-full mx-1 transition-all duration-300",
            bulletActiveClass:
              "swiper-pagination-bullet-active bg-[#8b5134] w-3.5 h-3.5",
          }}
          autoplay={{ delay: 4000, disableOnInteraction: false }}
          loop={true}
          className="w-full h-full"
        >
          {slides.map((slide, idx) => (
            <SwiperSlide key={idx} className="relative flex justify-center items-center">
              <img
                src={slide.mobile}
                alt={slide.alt}
                className="w-full h-full object-cover"
              />

              {/* Discount Banner Overlay (Mobile) */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#f0e4d4]/90 border border-[#835339]/30 rounded-md shadow px-4 py-2 text-center">
                <h2 className="text-[#1e4323] text-xs sm:text-sm font-headingOne font-semibold uppercase">
                  Use Code: <span className="bg-[#835339] text-white px-2 rounded">MELITA50</span>
                </h2>
                <p className="text-[10px] sm:text-xs text-gray-700 italic">40% OFF • Limited Time</p>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        <div className="mobile-pagination absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2"></div>
      </div>
    </section>
  );
};

export default Hero;
