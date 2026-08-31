export interface StateCities {
  state: string;
  cities: string[];
}

export const INDIA_STATES_AND_CITIES: Record<string, string[]> = {
  'Andhra Pradesh': [
    'Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Kakinada',
    'Rajahmundry', 'Tirupati', 'Kadapa', 'Anantapur', 'Vizianagaram', 'Eluru',
    'Ongole', 'Nandyal', 'Machilipatnam', 'Adoni', 'Tenali', 'Proddatur',
    'Chittoor', 'Hindupur', 'Bhimavaram', 'Madanapalle', 'Guntakal', 'Srikakulam',
    'Dharmavaram', 'Gudivada', 'Narasaraopet', 'Tadipatri', 'Mangalagiri', 'Tadepalligudem'
  ],
  'Arunachal Pradesh': [
    'Itanagar', 'Naharlagun', 'Pasighat', 'Namsai', 'Tawang', 'Ziro',
    'Bomdila', 'Roing', 'Tezu', 'Aalo', 'Changlang', 'Khonsa', 'Seppa'
  ],
  'Assam': [
    'Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia',
    'Tezpur', 'Bongaigaon', 'Dhubri', 'Diphu', 'North Lakhimpur', 'Karimganj',
    'Sivasagar', 'Goalpara', 'Barpeta', 'Golaghat', 'Lumding', 'Hailakandi', 'Dhekiajuli'
  ],
  'Bihar': [
    'Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga',
    'Bihar Sharif', 'Arrah', 'Begusarai', 'Katihar', 'Munger', 'Chhapra',
    'Danapur', 'Bettiah', 'Saharsa', 'Sasaram', 'Hajipur', 'Dehri', 'Siwan',
    'Motihari', 'Nawada', 'Bagaha', 'Buxar', 'Kishanganj', 'Sitamarhi', 'Jamui', 'Jehanabad'
  ],
  'Chhattisgarh': [
    'Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Rajnandgaon', 'Raigarh',
    'Jagdalpur', 'Ambikapur', 'Dhamtari', 'Mahasamund', 'Durg', 'Kanker',
    'Bhatapara', 'Champa', 'Kawardha', 'Janjgir', 'Sakti'
  ],
  'Goa': [
    'Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda', 'Bicholim',
    'Curchorem', 'Cuncolim', 'Canacona', 'Valpoi', 'Sanquelim', 'Pernem'
  ],
  'Gujarat': [
    'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar',
    'Junagadh', 'Gandhinagar', 'Gandhidham', 'Anand', 'Navsari', 'Morbi',
    'Nadiad', 'Surendranagar', 'Bharuch', 'Mehsana', 'Bhuj', 'Porbandar',
    'Palanpur', 'Valsad', 'Vapi', 'Gondal', 'Veraval', 'Godhra', 'Patan',
    'Dahod', 'Botad', 'Amreli', 'Deesa', 'Jetpur', 'Kalol', 'Bardoli'
  ],
  'Haryana': [
    'Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak',
    'Hisar', 'Karnal', 'Sonipat', 'Panchkula', 'Bhiwani', 'Sirsa',
    'Bahadurgarh', 'Jind', 'Thanesar', 'Kaithal', 'Rewari', 'Palwal', 'Hansi', 'Narnaul'
  ],
  'Himachal Pradesh': [
    'Shimla', 'Dharamshala', 'Solan', 'Mandi', 'Palampur', 'Baddi',
    'Nahan', 'Paonta Sahib', 'Sundarnagar', 'Chamba', 'Kullu', 'Manali',
    'Una', 'Hamirpur', 'Bilaspur', 'Kangra', 'Nurpur'
  ],
  'Jharkhand': [
    'Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro Steel City', 'Deoghar', 'Phusro',
    'Hazaribagh', 'Giridih', 'Ramgarh', 'Medininagar (Daltonganj)', 'Chirkunda',
    'Jhumri Telaiya', 'Sahibganj', 'Chaibasa', 'Dumka', 'Gumia', 'Madhupur'
  ],
  'Karnataka': [
    'Bengaluru', 'Mysuru', 'Hubballi-Dharwad', 'Mangaluru', 'Belagavi', 'Kalaburagi',
    'Davanagere', 'Ballari', 'Vijayapura', 'Shivamogga', 'Tumakuru', 'Raichur',
    'Bidar', 'Hosapete', 'Gadag-Betageri', 'Hassan', 'Udupi', 'Bhadravati',
    'Chitradurga', 'Kolar', 'Mandya', 'Chikkamagaluru', 'Gangavathi', 'Bagalkote', 'Ranebennuru'
  ],
  'Kerala': [
    'Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Kollam', 'Thrissur', 'Kannur',
    'Alappuzha', 'Kottayam', 'Palakkad', 'Manjeri', 'Thalassery', 'Ponnani',
    'Vatakara', 'Kanhangad', 'Payyanur', 'Koyilandy', 'Neyyattinkara', 'Kayamkulam',
    'Malappuram', 'Guruvayur', 'Kasargod', 'Changanassery', 'Pathanamthitta'
  ],
  'Madhya Pradesh': [
    'Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar',
    'Dewas', 'Satna', 'Ratlam', 'Rewa', 'Katni', 'Singrauli',
    'Burhanpur', 'Khandwa', 'Bhind', 'Chhindwara', 'Guna', 'Shivpuri',
    'Vidisha', 'Chhatarpur', 'Damoh', 'Mandsaur', 'Khargone', 'Neemuch', 'Pithampur', 'Hoshangabad'
  ],
  'Maharashtra': [
    'Mumbai', 'Pune', 'Nagpur', 'Thane', 'Pimpri-Chinchwad', 'Nashik',
    'Kalyan-Dombivli', 'Vasai-Virar', 'Aurangabad (Chhatrapati Sambhaji Nagar)',
    'Navi Mumbai', 'Solapur', 'Mira-Bhayandar', 'Bhiwandi', 'Amravati', 'Nanded',
    'Kolhapur', 'Ulhasnagar', 'Sangli-Miraj', 'Malegaon', 'Jalgaon', 'Akola',
    'Latur', 'Dhule', 'Ahmednagar', 'Chandrapur', 'Parbhani', 'Ichalkaranji',
    'Jalna', 'Ambarnath', 'Bhusawal', 'Panvel', 'Badlapur', 'Beed', 'Gondia', 'Satara', 'Baramati'
  ],
  'Manipur': [
    'Imphal', 'Thoubal', 'Bishnupur', 'Churachandpur', 'Kakching', 'Ukhrul', 'Senapati', 'Tamenglong'
  ],
  'Meghalaya': [
    'Shillong', 'Tura', 'Nongpoh', 'Jowai', 'Baghmara', 'Williamnagar', 'Resubelpara', 'Mairang'
  ],
  'Mizoram': [
    'Aizawl', 'Lunglei', 'Champhai', 'Serchhip', 'Kolasib', 'Lawngtlai', 'Saitual', 'Mamit'
  ],
  'Nagaland': [
    'Kohima', 'Dimapur', 'Mokokchung', 'Tuensang', 'Wokha', 'Zunheboto', 'Mon', 'Phek'
  ],
  'Odisha': [
    'Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri',
    'Balasore', 'Bhadrak', 'Baripada', 'Jharsuguda', 'Jeypore', 'Bargarh',
    'Rayagada', 'Bolangir', 'Angul', 'Dhenkanal', 'Kendrapara', 'Paradeep',
    'Jajpur', 'Kendujhar', 'Sunabeda', 'Bhawanipatna', 'Talcher', 'Jatni'
  ],
  'Punjab': [
    'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Hoshiarpur',
    'Mohali (SAS Nagar)', 'Batala', 'Pathankot', 'Moga', 'Abohar', 'Malerkotla',
    'Khanna', 'Muktsar', 'Barnala', 'Firozpur', 'Kapurthala', 'Phagwara', 'Zirakpur', 'Rajpura'
  ],
  'Rajasthan': [
    'Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer', 'Udaipur',
    'Bhilwara', 'Alwar', 'Bharatpur', 'Sikar', 'Pali', 'Sri Ganganagar',
    'Kishangarh', 'Baran', 'Dhaulpur', 'Tonk', 'Beawar', 'Hanumangarh',
    'Churu', 'Gangapur City', 'Jhunjhunu', 'Sawai Madhopur', 'Nagaur', 'Makrana', 'Chittorgarh', 'Bhiwadi'
  ],
  'Sikkim': [
    'Gangtok', 'Namchi', 'Geyzing', 'Mangan', 'Rangpo', 'Singtam', 'Jorethang'
  ],
  'Tamil Nadu': [
    'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tiruppur',
    'Erode', 'Vellore', 'Thoothukudi', 'Dindigul', 'Thanjavur', 'Ranipet',
    'Sivakasi', 'Karur', 'Udhagamandalam (Ooty)', 'Hosur', 'Nagercoil', 'Kanchipuram',
    'Kumarapalayam', 'Karaikkudi', 'Neyveli', 'Cuddalore', 'Kumbakonam', 'Tiruvannamalai',
    'Pollachi', 'Rajapalayam', 'Gudiyatham', 'Pudukkottai', 'Vaniyambadi', 'Ambur', 'Nagapattinam'
  ],
  'Telangana': [
    'Hyderabad', 'Warangal', 'Nizamabad', 'Khammam', 'Karimnagar', 'Ramagundam',
    'Mahbubnagar', 'Nalgonda', 'Adilabad', 'Suryapet', 'Miryalaguda', 'Siddipet',
    'Jagtial', 'Mancherial', 'Nirmal', 'Kamareddy', 'Kothagudem', 'Bodhan', 'Palwancha', 'Secunderabad'
  ],
  'Tripura': [
    'Agartala', 'Dharmanagar', 'Udaipur', 'Kailashahar', 'Bishalgarh', 'Teliamura', 'Khowai', 'Belonia', 'Ambassa'
  ],
  'Uttar Pradesh': [
    'Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Meerut', 'Varanasi',
    'Prayagraj (Allahabad)', 'Bareilly', 'Aligarh', 'Moradabad', 'Saharanpur', 'Gorakhpur',
    'Noida', 'Firozabad', 'Jhansi', 'Muzaffarnagar', 'Mathura', 'Budaun',
    'Rampur', 'Shahjahanpur', 'Farrukhabad', 'Ayodhya (Faizabad)', 'Mau', 'Hapur',
    'Etawah', 'Mirzapur', 'Bulandshahr', 'Sambhal', 'Amroha', 'Hardoi',
    'Fatehpur', 'Raebareli', 'Orai', 'Sitapur', 'Bahraich', 'Modinagar', 'Unnao', 'Jaunpur', 'Lakhimpur', 'Greater Noida'
  ],
  'Uttarakhand': [
    'Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rudrapur', 'Kashipur',
    'Rishikesh', 'Kotdwar', 'Pithoragarh', 'Ramnagar', 'Manglaur', 'Mussoorie',
    'Kichha', 'Nainital', 'Almora', 'Tehri'
  ],
  'West Bengal': [
    'Kolkata', 'Howrah', 'Asansol', 'Siliguri', 'Durgapur', 'Bardhaman',
    'Malda', 'Baharampur', 'Habra', 'Kharagpur', 'Shantipur', 'Dankuni',
    'Dhulian', 'Ranaghat', 'Haldia', 'Raiganj', 'Krishnanagar', 'Nabadwip',
    'Medinipur', 'Jalpaiguri', 'Balurghat', 'Basirhat', 'Bankura', 'Chakdaha', 'Darjeeling', 'Purulia'
  ],
  // Union Territories
  'Delhi': [
    'Central Delhi', 'New Delhi', 'North Delhi', 'North East Delhi', 'North West Delhi',
    'South Delhi', 'South East Delhi', 'South West Delhi', 'West Delhi', 'Shahdara', 'East Delhi',
    'Connaught Place', 'Karol Bagh', 'Lajpat Nagar', 'Chandni Chowk', 'Saket', 'Rohini', 'Dwarka', 'Pitampura', 'Janakpuri'
  ],
  'Chandigarh': [
    'Chandigarh', 'Sector 17', 'Sector 35', 'Sector 22', 'Manimajra', 'Industrial Area'
  ],
  'Jammu and Kashmir': [
    'Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Kathua', 'Udhampur',
    'Sopore', 'Punch', 'Rajouri', 'Ganderbal', 'Budgam', 'Kupwara', 'Pulwama'
  ],
  'Ladakh': [
    'Leh', 'Kargil', 'Diskit', 'Padum'
  ],
  'Puducherry': [
    'Puducherry', 'Oulgaret', 'Karaikal', 'Mahe', 'Yanam'
  ],
  'Andaman and Nicobar Islands': [
    'Port Blair', 'Garacharma', 'Bambooflat', 'Prothrapur'
  ],
  'Dadra and Nagar Haveli and Daman and Diu': [
    'Daman', 'Diu', 'Silvassa', 'Amli'
  ],
  'Lakshadweep': [
    'Kavaratti', 'Agatti', 'Andrott', 'Minicoy', 'Amini'
  ]
};

export const ALL_INDIAN_STATES = Object.keys(INDIA_STATES_AND_CITIES).sort();
