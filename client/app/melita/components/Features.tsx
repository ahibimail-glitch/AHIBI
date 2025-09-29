

const Features = () => {
  const features = [
    {
      
      title: "DERMATOLOGICALLY",
      subtitle: "TESTED",
      description: "Clinically tested for safety and efficacy",
      src:"/melita/der.png"
    },
    {
    
      title: "VEGAN &",
      subtitle: "CRUELTY FREE",
      description: "Ethically made without animal testing",
      src:"/melita/Vegan.png"
    },
    {
      
      title: "INDIAN SKIN",
      subtitle: "FOCUSED",
      description: "Specially formulated for Indian skin tones",
      src:"/melita/indian.png"
    },
    {
      
      title: "ACTIVES AT",
      subtitle: "OPTIMAL PERCENTAGE",
      description: "Maximum efficacy with proven concentrations",
      src:"/melita/active.png"
    }
  ];

  return (
    <section className="bg-white py-4 sm:py-14 px-4">
      <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 text-center">
        {features.map((feature, index) => (
          <div key={index} className="flex flex-col items-center">
            {/* Icon */}
            <img 
              src={feature.src} 
              alt={feature.title} 
              className="h-10 sm:h-16 mb-4"
            />

            {/* Title & Subtitle */}
            <h3 className="text-[#1e4323] text-[14px] md:text-xl font-headingOne font-medium uppercase">
              {feature.title}
            </h3>
            <h3 className="text-[#1e4323] text-[14px] md:text-xl font-headingOne font-medium uppercase">
              {feature.subtitle}
            </h3>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Features;
