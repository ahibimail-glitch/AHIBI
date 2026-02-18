// cast-carausel.tsx (updated ArtistCarousel with continuous marquee effect)
import React from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const ArtistCarousel = () => {
  const demoArtists = [
    {
      image: "/kU3B75TyRiCgE270EyZnHjfivoq.jpg",
      name: "Robert Downey Jr.",
      role: "Actor / Producer",
    },
    {
      image: "/hJuDvwzS0SPlsE6MNFOpznQltDZ.jpg",
      name: "Chris Evans",
      role: "Actor",
    },
    {
      image: "/fBEucxECxGLKVHBznO0qHtCGiMO.jpg",
      name: "Scarlett Johansson",
      role: "Actress / Producer",
    },
    {
      image: "/hJuDvwzS0SPlsE6MNFOpznQltDZ.jpg",
      name: "Mark Ruffalo",
      role: "Actor",
    },
    {
      image: "/fBEucxECxGLKVHBznO0qHtCGiMO.jpg",
      name: "Chris Hemsworth",
      role: "Actor",
    },
  ];

  const continuousItems = [...demoArtists, ...demoArtists];

  const settings = {
    infinite: true,
    speed: 5000,
    autoplay: true,
    autoplaySpeed: 0,
    cssEase: "linear",
    slidesToShow: 5,
    slidesToScroll: 1,
    arrows: false,
    pauseOnHover: false,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3,
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 2,
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
        },
      },
    ],
  };

  return (
    <div className="py-10 px-4 bg-muted/50 border-t border-b">
      <Slider {...settings}>
        {continuousItems.map((artist, index) => (
          <div key={index} className="px-4">
            <div className="flex flex-col items-center">
              <div className="w-24 h-24">
                <img
                  src={`https://image.tmdb.org/t/p/original${artist.image}`}
                  alt={artist.name}
                  className="w-full h-full rounded-full object-cover object-center"
                />
              </div>
              <h1 className="text-gray-700 text-base font-semibold mt-2 text-center">
                {artist.name}
              </h1>
              <h5 className="text-gray-500 text-sm text-center">{artist.role}</h5>
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
};

export default ArtistCarousel;
