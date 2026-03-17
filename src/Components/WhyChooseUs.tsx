import React from 'react';
import { Clock, ShieldCheck, Stethoscope, QrCode } from 'lucide-react';
import { motion } from 'framer-motion';

const WhyChooseUs = ({ lang, t }: { lang: string, t: any }) => {
  const steps = [
    {
      icon: Clock,
      title: t.step1Title,
      desc: t.step1Desc,
      step: 1
    },
    {
      icon: ShieldCheck,
      title: t.step2Title,
      desc: t.step2Desc,
      step: 2
    },
    {
      icon: Stethoscope,
      title: t.step3Title,
      desc: t.step3Desc,
      step: 3
    },
    {
      icon: QrCode,
      title: t.step4Title,
      desc: t.step4Desc,
      step: 4
    }
  ];

  return (
    <section className="py-20 bg-gray-50 overflow-hidden" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl font-bold text-gray-900 border-b-4 border-blue-600 inline-block pb-2 px-4"
          >
            {t.whyTaibaTitle}
          </motion.h2>
        </div>

        <div className="relative">
          {/* Mobile Vertical Timeline Layout */}
          <div className="lg:hidden flex flex-col space-y-8 relative" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            {/* Connecting Dashed Line (Mobile) */}
            <div className={`absolute ${lang === 'ar' ? 'right-[2rem]' : 'left-[2rem]'} top-10 bottom-10 w-0.5 border-r-2 border-dashed border-gray-300 -z-10`}></div>

            {steps.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: lang === 'ar' ? 20 : -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`flex ${lang === 'ar' ? 'flex-row' : 'flex-row-reverse'} items-center relative`}
              >
                {/* Icon Box */}
                <div className="relative w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg">
                  <item.icon className="w-8 h-8" />
                  {/* Overlapping Number Badge */}
                  <div className={`absolute -top-3 ${lang === 'ar' ? '-right-3' : '-left-3'} w-8 h-8 bg-orange-500 text-white font-bold rounded-full flex items-center justify-center border-[3px] border-white shadow-sm text-sm`}>
                    {item.step}
                  </div>
                </div>

                {/* Text Block */}
                <div className={`flex-1 ${lang === 'ar' ? 'pr-6 text-right' : 'pl-6 text-left'}`}>
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Desktop Grid Layout (LG and above) */}
          <div className="hidden lg:block relative">
            <div className="absolute top-10 left-10 right-10 h-0.5 border-t-2 border-dashed border-blue-200 z-0"></div>
            <div className="grid grid-cols-4 gap-8 relative z-10">
              {steps.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex flex-col items-center text-center group w-full"
                >
                  <div className="relative mb-6">
                    <div className={`absolute -top-1 ${lang === 'ar' ? '-right-1' : '-left-1'} w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm z-20 shadow-lg border-2 border-white`}>
                      {item.step}
                    </div>
                    <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-blue-200 group-hover:bg-blue-700">
                      <item.icon className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-blue-600 transition-colors duration-300">
                    {item.title}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed max-w-[200px]">
                    {item.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};



export default WhyChooseUs;


