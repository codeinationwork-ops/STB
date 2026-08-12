import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, FileText, RefreshCw, ArrowLeft, Phone, Mail, MapPin, Clock, Home, ChevronRight } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

export type PolicyType = 'terms' | 'privacy' | 'refund';

interface PolicyPagesProps {
  policyType: PolicyType;
  onNavigateHome: () => void;
  onNavigatePolicy: (policy: PolicyType) => void;
}

export const PolicyPages: React.FC<PolicyPagesProps> = ({
  policyType,
  onNavigateHome,
  onNavigatePolicy
}) => {
  return (
    <div className="min-h-screen bg-[#FDFCFB] text-slate-900 flex flex-col font-sans relative selection:bg-purple-600 selection:text-white">
      
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] sm:w-[1100px] h-[450px] bg-gradient-to-b from-purple-100/50 via-slate-50/40 to-transparent rounded-full blur-3xl opacity-80" />
        <div className="absolute inset-0 bg-[radial-gradient(#9333ea_0.8px,transparent_0.8px)] [background-size:32px_32px] opacity-[0.03]" />
      </div>

      {/* HEADER BAR */}
      <header className="sticky top-0 z-30 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-xl px-4 lg:px-8 h-[68px] sm:h-[76px] flex items-center justify-between gap-4 max-w-7xl mx-auto shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="cursor-pointer" onClick={onNavigateHome}>
            <BrandLogo size="md" />
          </div>
          <div className="h-5 w-px bg-slate-300 hidden sm:block" />
          <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">
            Legal &amp; Compliance Portal
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateHome}
            className="h-[38px] sm:h-[42px] px-4 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono font-bold text-xs flex items-center gap-2 transition-all cursor-pointer border border-slate-200"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
            <span>Back to Home</span>
          </button>
        </div>
      </header>

      {/* POLICY SUB-HEADER & NAVIGATION PILLS */}
      <div className="relative z-10 bg-slate-900 text-white border-b border-slate-800 py-6 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-purple-400 mb-1">
              <span className="cursor-pointer hover:underline flex items-center gap-1" onClick={onNavigateHome}>
                <Home className="w-3.5 h-3.5" /> Home
              </span>
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <span className="text-slate-300">Legal Documents</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {policyType === 'terms' && 'Terms & Conditions'}
              {policyType === 'privacy' && 'Privacy Policy'}
              {policyType === 'refund' && 'Refund & Cancellation Policy'}
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Platform Owner: 7608807790 | Registered Office: Rajendrapur, Bhadrak- 756112, Orissa
            </p>
          </div>

          {/* Navigation Pills */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 no-scrollbar">
            <button
              onClick={() => onNavigatePolicy('terms')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold font-mono flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                policyType === 'terms'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 ring-2 ring-purple-400/50'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Terms &amp; Conditions</span>
            </button>

            <button
              onClick={() => onNavigatePolicy('privacy')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold font-mono flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                policyType === 'privacy'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 ring-2 ring-purple-400/50'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Privacy Policy</span>
            </button>

            <button
              onClick={() => onNavigatePolicy('refund')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold font-mono flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                policyType === 'refund'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 ring-2 ring-purple-400/50'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refund &amp; Cancellation</span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN DOCUMENT BODY */}
      <main className="relative z-10 flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        <motion.div
          key={policyType}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-200 space-y-8 text-slate-800 font-sans leading-relaxed text-sm"
        >
          {/* TERMS & CONDITIONS PAGE */}
          {policyType === 'terms' && (
            <div className="space-y-6">
              <div className="border-b border-slate-200 pb-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-700 font-mono text-xs font-extrabold mb-2">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Official Terms of Service</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">Terms &amp; Conditions</h2>
                <p className="text-xs font-mono text-slate-500 mt-1">Domain: https://shopscoper.com/ | Platform Owner: 7608807790</p>
              </div>

              <div className="space-y-5 text-sm leading-relaxed text-slate-700">
                <p className="bg-slate-50 p-4 rounded-2xl border border-slate-200 font-medium text-slate-800">
                  <strong>1. Electronic Record:</strong> This document is an electronic record in terms of Information Technology Act, 2000 and rules thereunder as applicable and the amended provisions pertaining to electronic records in various statutes as amended by the Information Technology Act, 2000. This electronic record is generated by a computer system and does not require any physical or digital signatures.
                </p>

                <p>
                  <strong>2. Intermediary Guidelines Compliance:</strong> This document is published in accordance with the provisions of Rule 3 (1) of the Information Technology (Intermediaries guidelines) Rules, 2011 that require publishing the rules and regulations, privacy policy and Terms of Use for access or usage of domain name <a href="https://shopscoper.com/" target="_blank" rel="noreferrer" className="text-purple-600 underline font-semibold">https://shopscoper.com/</a> ('Website'), including the related mobile site and mobile application (hereinafter referred to as 'Platform').
                </p>

                <p>
                  <strong>3. Platform Ownership:</strong> The Platform is owned by <strong>7608807790</strong>, a company incorporated under the Companies Act, 1956 with its registered office at <strong>Rajendrapur, Bhadrak- 756112, Orissa</strong> (hereinafter referred to as 'Platform Owner', 'we', 'us', 'our').
                </p>

                <p>
                  <strong>4. Binding Agreement:</strong> Your use of the Platform and services and tools are governed by the following terms and conditions ("Terms of Use") as applicable to the Platform including the applicable policies which are incorporated herein by way of reference. If You transact on the Platform, You shall be subject to the policies that are applicable to the Platform for such transaction. By mere use of the Platform, You shall be contracting with the Platform Owner and these terms and conditions including the policies constitute Your binding obligations, with Platform Owner. These Terms of Use relate to your use of our website, goods (as applicable) or services (as applicable) (collectively, 'Services'). Any terms and conditions proposed by You which are in addition to or which conflict with these Terms of Use are expressly rejected by the Platform Owner and shall be of no force or effect. These Terms of Use can be modified at any time without assigning any reason. It is your responsibility to periodically review these Terms of Use to stay informed of updates.
                </p>

                <p>
                  <strong>5. Definition of User:</strong> For the purpose of these Terms of Use, wherever the context so requires ‘you’, 'your' or ‘user’ shall mean any natural or legal person who has agreed to become a user/buyer on the Platform.
                </p>

                <div className="bg-amber-50 border border-amber-200 text-amber-950 p-5 rounded-2xl font-bold uppercase text-xs sm:text-sm tracking-wide leading-relaxed">
                  ACCESSING, BROWSING OR OTHERWISE USING THE PLATFORM INDICATES YOUR AGREEMENT TO ALL THE TERMS AND CONDITIONS UNDER THESE TERMS OF USE, SO PLEASE READ THE TERMS OF USE CAREFULLY BEFORE PROCEEDING.
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h3 className="font-extrabold text-slate-900 text-base">7. Specific Terms Governing Use of Services:</h3>
                  <ol className="list-decimal pl-5 space-y-3 text-slate-700">
                    <li>To access and use the Services, you agree to provide true, accurate and complete information to us during and after registration, and you shall be responsible for all acts done through the use of your registered account on the Platform.</li>
                    <li>Neither we nor any third parties provide any warranty or guarantee as to the accuracy, timeliness, performance, completeness or suitability of the information and materials offered on this website or through the Services, for any specific purpose. You acknowledge that such information and materials may contain inaccuracies or errors and we expressly exclude liability for any such inaccuracies or errors to the fullest extent permitted by law.</li>
                    <li>Your use of our Services and the Platform is solely and entirely at your own risk and discretion for which we shall not be liable to you in any manner. You are required to independently assess and ensure that the Services meet your requirements.</li>
                    <li>The contents of the Platform and the Services are proprietary to us and are licensed to us. You will not have any authority to claim any intellectual property rights, title, or interest in its contents. The contents includes and is not limited to the design, layout, look and graphics.</li>
                    <li>You acknowledge that unauthorized use of the Platform and/or the Services may lead to action against you as per these Terms of Use and/or applicable laws.</li>
                    <li>You agree to pay us the charges associated with availing the Services.</li>
                    <li>You agree not to use the Platform and/ or Services for any purpose that is unlawful, illegal or forbidden by these Terms, or Indian or local laws that might apply to you.</li>
                    <li>You agree and acknowledge that website and the Services may contain links to other third party websites. On accessing these links, you will be governed by the terms of use, privacy policy and such other policies of such third party websites. These links are provided for your convenience for provide further information.</li>
                    <li>You understand that upon initiating a transaction for availing the Services you are entering into a legally binding and enforceable contract with the Platform Owner for the Services.</li>
                    <li>You shall indemnify and hold harmless Platform Owner, its affiliates, group companies (as applicable) and their respective officers, directors, agents, and employees, from any claim or demand, or actions including reasonable attorney's fees, made by any third party or penalty imposed due to or arising out of Your breach of this Terms of Use, privacy Policy and other Policies, or Your violation of any law, rules or regulations or the rights (including infringement of intellectual property rights) of a third party.</li>
                    <li>Notwithstanding anything contained in these Terms of Use, the parties shall not be liable for any failure to perform an obligation under these Terms if performance is prevented or delayed by a force majeure event.</li>
                    <li>These Terms and any dispute or claim relating to it, or its enforceability, shall be governed by and construed in accordance with the laws of India.</li>
                    <li>All disputes arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts in Bhadrak, Orissa, India.</li>
                    <li>All concerns or communications relating to these Terms must be communicated to us using the contact information provided on this website.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* PRIVACY POLICY PAGE */}
          {policyType === 'privacy' && (
            <div className="space-y-6">
              <div className="border-b border-slate-200 pb-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-mono text-xs font-extrabold mb-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Data Protection &amp; Privacy Statement</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">Privacy Policy</h2>
                <p className="text-xs font-mono text-slate-500 mt-1">Last Updated: 2026 | Platform Owner: 7608807790</p>
              </div>

              <div className="space-y-6 text-sm leading-relaxed text-slate-700">
                <section className="space-y-2">
                  <h3 className="font-extrabold text-slate-950 text-base">1. Introduction</h3>
                  <p>
                    This Privacy Policy describes how <strong>7608807790</strong> and its affiliates (collectively "7608807790, we, our, us") collect, use, share, protect or otherwise process your information/ personal data through our website <a href="https://shopscoper.com/" target="_blank" rel="noreferrer" className="text-purple-600 underline font-semibold">https://shopscoper.com/</a> (hereinafter referred to as Platform). Please note that you may be able to browse certain sections of the Platform without registering with us. We do not offer any product/service under this Platform outside India and your personal data will primarily be stored and processed in India. By visiting this Platform, providing your information or availing any product/service offered on the Platform, you expressly agree to be bound by the terms and conditions of this Privacy Policy, the Terms of Use and the applicable service/product terms and conditions, and agree to be governed by the laws of India including but not limited to the laws applicable to data protection and privacy. If you do not agree please do not use or access our Platform.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-extrabold text-slate-950 text-base">2. Collection of Information</h3>
                  <p>
                    We collect your personal data when you use our Platform, services or otherwise interact with us during the course of our relationship and related information provided from time to time. Some of the information that we may collect includes but is not limited to personal data / information provided to us during sign-up/registering or using our Platform such as name, date of birth, address, telephone/mobile number, email ID and/or any such information shared as proof of identity or address. Some of the sensitive personal data may be collected with your consent, such as your bank account or credit or debit card or other payment instrument information or biometric information such as your facial features or physiological information (in order to enable use of certain features when opted for, available on the Platform) etc all of the above being in accordance with applicable law(s). You always have the option to not provide information, by choosing not to use a particular service or feature on the Platform. We may track your behaviour, preferences, and other information that you choose to provide on our Platform. This information is compiled and analysed on an aggregated basis. We will also collect your information related to your transactions on Platform and such third-party business partner platforms. When such a third-party business partner collects your personal data directly from you, you will be governed by their privacy policies. We shall not be responsible for the third-party business partner’s privacy practices or the content of their privacy policies, and we request you to read their privacy policies prior to disclosing any information. If you receive an email, a call from a person/association claiming to be 7608807790 seeking any personal data like debit/credit card PIN, net-banking or mobile banking password, we request you to never provide such information. If you have already revealed such information, report it immediately to an appropriate law enforcement agency.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-extrabold text-slate-950 text-base">3. Usage of Personal Data</h3>
                  <p>
                    We use personal data to provide the services you request. To the extent we use your personal data to market to you, we will provide you the ability to opt-out of such uses. We use your personal data to assist sellers and business partners in handling and fulfilling orders; enhancing customer experience; to resolve disputes; troubleshoot problems; inform you about online and offline offers, products, services, and updates; customise your experience; detect and protect us against error, fraud and other criminal activity; enforce our terms and conditions; conduct marketing research, analysis and surveys; and as otherwise described to you at the time of collection of information. You understand that your access to these products/services may be affected in the event permission is not provided to us.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-extrabold text-slate-950 text-base">4. Sharing of Personal Data</h3>
                  <p>
                    We may share your personal data internally within our group entities, our other corporate entities, and affiliates to provide you access to the services and products offered by them. These entities and affiliates may market to you as a result of such sharing unless you explicitly opt-out. We may disclose personal data to third parties such as sellers, business partners, third party service providers including logistics partners, prepaid payment instrument issuers, third-party reward programs and other payment opted by you. These disclosure may be required for us to provide you access to our services and products offered to you, to comply with our legal obligations, to enforce our user agreement, to facilitate our marketing and advertising activities, to prevent, detect, mitigate, and investigate fraudulent or illegal activities related to our services. We may disclose personal and sensitive personal data to government agencies or other authorised law enforcement agencies if required to do so by law or in the good faith belief that such disclosure is reasonably necessary to respond to subpoenas, court orders, or other legal process. We may disclose personal data to law enforcement offices, third party rights owners, or others in the good faith belief that such disclosure is reasonably necessary to: enforce our Terms of Use or Privacy Policy; respond to claims that an advertisement, posting or other content violates the rights of a third party; or protect the rights, property or personal safety of our users or the general public.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-extrabold text-slate-950 text-base">5. Security Precautions</h3>
                  <p>
                    To protect your personal data from unauthorised access or disclosure, loss or misuse we adopt reasonable security practices and procedures. Once your information is in our possession or whenever you access your account information, we adhere to our security guidelines to protect it against unauthorised access and offer the use of a secure server. However, the transmission of information is not completely secure for reasons beyond our control. By using the Platform, the users accept the security implications of data transmission over the internet and the World Wide Web which cannot always be guaranteed as completely secure, and therefore, there would always remain certain inherent risks regarding use of the Platform. Users are responsible for ensuring the protection of login and password records for their account.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-extrabold text-slate-950 text-base">6. Data Deletion and Retention</h3>
                  <p>
                    You have an option to delete your account by visiting your profile and settings on our Platform, this action would result in you losing all information related to your account. You may also write to us at the contact information provided below to assist you with these requests. We may in event of any pending grievance, claims, pending shipments or any other services we may refuse or delay deletion of the account. Once the account is deleted, you will lose access to the account. We retain your personal data information for a period no longer than is required for the purpose for which it was collected or as required under any applicable law. However, we may retain data related to you if we believe it may be necessary to prevent fraud or future abuse or for other legitimate purposes. We may continue to retain your data in anonymised form for analytical and research purposes.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-extrabold text-slate-950 text-base">7. Your Rights &amp; Consent</h3>
                  <p>
                    You may access, rectify, and update your personal data directly through the functionalities provided on the Platform. By visiting our Platform or by providing your information, you consent to the collection, use, storage, disclosure and otherwise processing of your information on the Platform in accordance with this Privacy Policy. If you disclose to us any personal data relating to other people, you represent that you have the authority to do so and permit us to use the information in accordance with this Privacy Policy. You, while providing your personal data over the Platform or any partner platforms or establishments, consent to us (including our other corporate entities, affiliates, lending partners, technology partners, marketing channels, business partners and other third parties) to contact you through SMS, instant messaging apps, call and/or e-mail for the purposes specified in this Privacy Policy. You have an option to withdraw your consent that you have already provided by writing to the Grievance Officer at the contact information provided below. Please mention “Withdrawal of consent for processing personal data” in your subject line of your communication.
                  </p>
                </section>

                <div className="bg-purple-50 border border-purple-200 p-6 rounded-3xl space-y-3 mt-6">
                  <h4 className="font-extrabold text-purple-900 text-base flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-purple-700" />
                    <span>Grievance Officer Details</span>
                  </h4>
                  <div className="text-xs sm:text-sm text-purple-950 space-y-1.5 font-mono">
                    <p><strong>Name of Office:</strong> ShopScoper Grievance Redressal</p>
                    <p><strong>Designation:</strong> Compliance Officer</p>
                    <p><strong>Company Address:</strong> Rajendrapur, Bhadrak- 756112, Orissa</p>
                    <p><strong>Contact Phone:</strong> 7608807790</p>
                    <p><strong>Operating Hours:</strong> Monday - Friday (9:00 - 18:00)</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* REFUND & CANCELLATION POLICY PAGE */}
          {policyType === 'refund' && (
            <div className="space-y-6">
              <div className="border-b border-slate-200 pb-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-mono text-xs font-extrabold mb-2">
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Returns &amp; Refund Guidelines</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">Refund and Cancellation Policy</h2>
                <p className="text-xs font-mono text-slate-500 mt-1">Platform Owner: 7608807790 | Registered Office: Rajendrapur, Bhadrak- 756112, Orissa</p>
              </div>

              <div className="space-y-6 text-sm leading-relaxed text-slate-700">
                <p className="bg-blue-50 border border-blue-200 text-blue-950 p-5 rounded-2xl font-medium">
                  This refund and cancellation policy outlines how you can cancel or seek a refund for a product / service that you have purchased through the Platform. Under this policy:
                </p>

                <ol className="list-decimal pl-5 space-y-5 text-slate-800">
                  <li className="pl-2">
                    <strong>Order Cancellation Requests:</strong> Cancellations will only be considered if the request is made <strong>1 days</strong> of placing the order. However, cancellation requests may not be entertained if the orders have been communicated to such sellers / merchant(s) listed on the Platform and they have initiated the process of shipping them, or the product is out for delivery. In such an event, you may choose to reject the product at the doorstep.
                  </li>

                  <li className="pl-2">
                    <strong>Perishable Items Exception:</strong> <strong>7608807790</strong> does not accept cancellation requests for perishable items like flowers, eatables, etc. However, the refund / replacement can be made if the user establishes that the quality of the product delivered is not good.
                  </li>

                  <li className="pl-2">
                    <strong>Damaged or Defective Goods:</strong> In case of receipt of damaged or defective items, please report to our customer service team. The request would be entertained once the seller/ merchant listed on the Platform, has checked and determined the same at its own end. This should be reported within <strong>1 days</strong> of receipt of products. In case you feel that the product received is not as shown on the site or as per your expectations, you must bring it to the notice of our customer service within <strong>1 days</strong> of receiving the product. The customer service team after looking into your complaint will take an appropriate decision.
                  </li>

                  <li className="pl-2">
                    <strong>Products with Manufacturer Warranty:</strong> In case of complaints regarding the products that come with a warranty from the manufacturers, please refer the issue to them.
                  </li>

                  <li className="pl-2">
                    <strong>Refund Processing Timeline:</strong> In case of any refunds approved by <strong>7608807790</strong>, it will take <strong>1 days</strong> for the refund to be processed to you.
                  </li>
                </ol>

                <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 p-6 rounded-3xl mt-6">
                  <h4 className="font-extrabold text-base mb-1.5 text-emerald-900">Customer Care Support line for Refund Inquiries:</h4>
                  <p className="text-xs sm:text-sm font-mono">
                    WhatsApp / Helpline: <strong>7608807790</strong> | Support Hours: Monday - Friday (9:00 - 18:00)
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 bg-slate-950 text-slate-400 py-10 border-t border-slate-800 text-xs font-mono mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <BrandLogo size="sm" />
              <span className="text-slate-400 font-sans text-xs">
                Empowering Local Tailoring Ecosystems &amp; Direct B2B Commerce
              </span>
            </div>

            <div className="flex items-center gap-3 flex-wrap justify-center">
              <button
                onClick={() => onNavigatePolicy('terms')}
                className={`hover:text-amber-400 transition-colors ${policyType === 'terms' ? 'text-amber-400 font-bold' : ''}`}
              >
                Terms &amp; Conditions
              </button>
              <span className="text-slate-700">•</span>
              <button
                onClick={() => onNavigatePolicy('privacy')}
                className={`hover:text-amber-400 transition-colors ${policyType === 'privacy' ? 'text-amber-400 font-bold' : ''}`}
              >
                Privacy Policy
              </button>
              <span className="text-slate-700">•</span>
              <button
                onClick={() => onNavigatePolicy('refund')}
                className={`hover:text-amber-400 transition-colors ${policyType === 'refund' ? 'text-amber-400 font-bold' : ''}`}
              >
                Refund &amp; Cancellation
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-[11px]">
            <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-start">
              <span>Phone: 7608807790</span>
              <span>Hours: Mon - Fri (09:00 - 18:00)</span>
              <span>Office: Rajendrapur, Bhadrak- 756112, Orissa</span>
            </div>
            <div>
              © 2026 ShopScoper Technologies. All Rights Reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
