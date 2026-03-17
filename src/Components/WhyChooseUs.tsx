import React from 'react';
import { Clock, ShieldCheck, Stethoscope, QrCode } from 'lucide-react';
import { motion } from 'framer-motion';

const steps = [
  {
    icon: Clock,
    title: 'خدمة 24 ساعة',
    desc: 'لا داعي للانتظار في العيادات. تواصل مع أفضل الأطباء على مدار الساعة.',
    step: 1
  },
  {
    icon: ShieldCheck,
    title: 'خصوصية وأمان',
    desc: 'نحرص على خصوصية معلوماتك الصحية ونستخدم أحدث تقنيات التشفير.',
    step: 2
  },
  {
    icon: Stethoscope,
    title: 'أطباء وصيادلة معتمدون',
    desc: 'شبكة من أفضل الممارسين الصحيين المعتمدين في مدينتك.',
    step: 3
  },
  {
    icon: QrCode,
    title: 'وصفات إلكترونية',
    desc: 'صرف الأدوية بسهولة عبر رموز QR الآمنة لمنع الأخطاء الطبية.',
    step: 4
  }
];

const WhyChooseUs = () => {
  return (
    <section className="py-20 bg-gray-50 overflow-hidden" dir="rtl">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl font-bold text-gray-900 border-b-4 border-blue-600 inline-block pb-2 px-4"
          >
            لماذا طيبة هيلث؟
          </motion.h2>
        </div>

        <div className="relative">
          {/* Desktop Connecting Line - Positioned at 40px (half of w-20 icon container) */}
          <div className="hidden lg:block absolute top-10 left-10 right-10 h-0.5 border-t-2 border-dashed border-blue-200 z-0"></div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 relative z-10">
            {steps.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex flex-col items-center text-center group w-full"
              >
                <div className="relative mb-4 md:mb-6">
                  {/* Step Number Badge */}
                  <div className="absolute -top-1 -right-1 w-6 h-6 md:w-8 md:h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-[10px] md:text-sm z-20 shadow-lg border-2 border-white">
                    {item.step}
                  </div>

                  {/* Icon Container */}
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-blue-200 group-hover:bg-blue-700">
                    <item.icon className="w-6 h-6 md:w-8 md:h-8 text-white" />
                  </div>
                </div>

                <h3 className="text-sm md:text-xl font-bold text-gray-800 mb-1 md:mb-3 group-hover:text-blue-600 transition-colors duration-300">
                  {item.title}
                </h3>

                <p className="text-gray-500 text-[10px] md:text-sm leading-relaxed max-w-[200px]">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};



export default WhyChooseUs;


