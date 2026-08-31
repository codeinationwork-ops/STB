export interface MeasurementFieldDef {
  key: string;
  label: string;
  sublabel?: string;
  placeholder: string;
  unit?: string;
  category: 'Topwear' | 'Bottomwear' | 'Other';
  gender: 'Female' | 'Male' | 'All';
  description?: string;
}

export interface MeasurementSectionDef {
  id: string;
  title: string;
  subtitle: string;
  gender: 'Female' | 'Male';
  targetGarments: string;
  fields: MeasurementFieldDef[];
}

/**
 * 1. Ladies Upper Body & Topwear (Blouse / Kurti / Suit / Anarkali)
 */
export const LADIES_TOPWEAR_FIELDS: MeasurementFieldDef[] = [
  {
    key: 'totalLength',
    label: 'Total Length',
    sublabel: 'Shoulder to hem',
    placeholder: 'e.g. 38"',
    category: 'Topwear',
    gender: 'Female',
    description: 'Full top-to-bottom length of garment (shoulder to hem).',
  },
  {
    key: 'shoulder',
    label: 'Shoulder',
    sublabel: 'Bone to bone',
    placeholder: 'e.g. 14.5"',
    category: 'Topwear',
    gender: 'Female',
    description: 'Back shoulder width from bone to bone.',
  },
  {
    key: 'upperChest',
    label: 'Upper Chest',
    sublabel: 'Under armpits',
    placeholder: 'e.g. 34"',
    category: 'Topwear',
    gender: 'Female',
    description: 'Circumference above the bust, right under armpits.',
  },
  {
    key: 'fullBust',
    label: 'Full Bust / Chest',
    sublabel: 'Fullest chest round',
    placeholder: 'e.g. 36"',
    category: 'Topwear',
    gender: 'Female',
    description: 'Fullest round measurement of the chest.',
  },
  {
    key: 'apexPoint',
    label: 'Apex Point / Bust Point',
    sublabel: 'Shoulder to nipple',
    placeholder: 'e.g. 10"',
    category: 'Topwear',
    gender: 'Female',
    description: 'Top shoulder to nipple point (for cup positioning & darts).',
  },
  {
    key: 'underBust',
    label: 'Under Bust / Choli Length',
    sublabel: 'Ribcage band',
    placeholder: 'e.g. 14"',
    category: 'Topwear',
    gender: 'Female',
    description: 'Shoulder down to ribcage band (for blouse waistband).',
  },
  {
    key: 'waist',
    label: 'Waist',
    sublabel: 'Natural narrow waist',
    placeholder: 'e.g. 30"',
    category: 'Topwear',
    gender: 'Female',
    description: 'Natural waist circumference (around the narrowest part of torso).',
  },
  {
    key: 'hip',
    label: 'Hip',
    sublabel: 'Widest hip round',
    placeholder: 'e.g. 38"',
    category: 'Topwear',
    gender: 'Female',
    description: 'Widest round over the hip area.',
  },
  {
    key: 'sideSlit',
    label: 'Side Slit / Chaak',
    sublabel: 'Slit start point',
    placeholder: 'e.g. 21"',
    category: 'Topwear',
    gender: 'Female',
    description: 'Shoulder down to the side open-slit starting point (for kurtis).',
  },
  {
    key: 'frontNeckDepth',
    label: 'Front Neck Depth',
    sublabel: 'Front drop',
    placeholder: 'e.g. 7"',
    category: 'Topwear',
    gender: 'Female',
    description: 'Shoulder point down diagonally to the front neck drop.',
  },
  {
    key: 'backNeckDepth',
    label: 'Back Neck Depth',
    sublabel: 'Back drop',
    placeholder: 'e.g. 8.5"',
    category: 'Topwear',
    gender: 'Female',
    description: 'Shoulder point down to the back neck drop.',
  },
  {
    key: 'armhole',
    label: 'Armhole',
    sublabel: 'Arm joint round',
    placeholder: 'e.g. 16"',
    category: 'Topwear',
    gender: 'Female',
    description: 'Circumference around the arm joint / armpit.',
  },
  {
    key: 'sleeveLength',
    label: 'Sleeve Length',
    sublabel: 'Tip to hem',
    placeholder: 'e.g. 11" / 21"',
    category: 'Topwear',
    gender: 'Female',
    description: 'Shoulder tip to end of sleeve (Short / 3/4th / Full).',
  },
  {
    key: 'bicep',
    label: 'Bicep / Arm Round',
    sublabel: 'Upper arm muscle',
    placeholder: 'e.g. 12.5"',
    category: 'Topwear',
    gender: 'Female',
    description: 'Widest round of the upper arm.',
  },
  {
    key: 'sleeveOpening',
    label: 'Sleeve Opening / Cuff',
    sublabel: 'Mori / End round',
    placeholder: 'e.g. 10"',
    category: 'Topwear',
    gender: 'Female',
    description: 'Circumference where the sleeve finishes.',
  },
];

/**
 * 2. Ladies Bottomwear (Salwar / Churidar / Cigarette Pant / Palazzo / Lehenga)
 */
export const LADIES_BOTTOMWEAR_FIELDS: MeasurementFieldDef[] = [
  {
    key: 'pantLength',
    label: 'Full Length',
    sublabel: 'Waistband to floor',
    placeholder: 'e.g. 39"',
    category: 'Bottomwear',
    gender: 'Female',
    description: 'Waistband tying point straight down to the ankle or floor.',
  },
  {
    key: 'tyingWaist',
    label: 'Tying Waist',
    sublabel: 'Fastening waist',
    placeholder: 'e.g. 32"',
    category: 'Bottomwear',
    gender: 'Female',
    description: 'Waist circumference where the bottom or skirt is fastened.',
  },
  {
    key: 'seatHip',
    label: 'Seat / Hip',
    sublabel: 'Fullest hip round',
    placeholder: 'e.g. 40"',
    category: 'Bottomwear',
    gender: 'Female',
    description: 'Fullest round around the hips.',
  },
  {
    key: 'thigh',
    label: 'Thigh Round',
    sublabel: 'Upper thigh width',
    placeholder: 'e.g. 23"',
    category: 'Bottomwear',
    gender: 'Female',
    description: 'Widest measurement around the upper thigh.',
  },
  {
    key: 'knee',
    label: 'Knee Round',
    sublabel: 'Knee joint round',
    placeholder: 'e.g. 16"',
    category: 'Bottomwear',
    gender: 'Female',
    description: 'Circumference around the knee joint.',
  },
  {
    key: 'calf',
    label: 'Calf Round',
    sublabel: 'Calf muscle round',
    placeholder: 'e.g. 13.5"',
    category: 'Bottomwear',
    gender: 'Female',
    description: 'Circumference around the calf muscle (for churidar gather).',
  },
  {
    key: 'bottomOpening',
    label: 'Bottom Opening / Ankle Round',
    sublabel: 'Mori / Hem opening',
    placeholder: 'e.g. 12"',
    category: 'Bottomwear',
    gender: 'Female',
    description: 'Circumference at the bottom leg opening.',
  },
  {
    key: 'crotchFork',
    label: 'Crotch / Fork / Rise',
    sublabel: 'Front to back rise',
    placeholder: 'e.g. 26"',
    category: 'Bottomwear',
    gender: 'Female',
    description: 'Measurement from front waistband through legs to rear waistband (for pants/palazzos).',
  },
];

/**
 * 3. Gents Topwear (Kurta / Sherwani / Shirt / Jacket)
 */
export const GENTS_TOPWEAR_FIELDS: MeasurementFieldDef[] = [
  {
    key: 'totalLength',
    label: 'Length',
    sublabel: 'Shoulder to knee/hip',
    placeholder: 'e.g. 40"',
    category: 'Topwear',
    gender: 'Male',
    description: 'Center back / shoulder down to knee, calf, or hip.',
  },
  {
    key: 'shoulder',
    label: 'Shoulder Width',
    sublabel: 'Bone to bone',
    placeholder: 'e.g. 18"',
    category: 'Topwear',
    gender: 'Male',
    description: 'Upper back shoulder bone to shoulder bone.',
  },
  {
    key: 'chest',
    label: 'Chest',
    sublabel: 'Full chest round',
    placeholder: 'e.g. 40"',
    category: 'Topwear',
    gender: 'Male',
    description: 'Circumference across the fullest chest area.',
  },
  {
    key: 'stomach',
    label: 'Stomach / Tummy',
    sublabel: 'Belly circumference',
    placeholder: 'e.g. 38"',
    category: 'Topwear',
    gender: 'Male',
    description: 'Mid-section circumference around the belly.',
  },
  {
    key: 'hip',
    label: 'Seat / Hip Round',
    sublabel: 'Lower waist/seat',
    placeholder: 'e.g. 42"',
    category: 'Topwear',
    gender: 'Male',
    description: 'Lower waist / seat circumference for long kurta flare.',
  },
  {
    key: 'neck',
    label: 'Collar / Neck',
    sublabel: 'Base neck size',
    placeholder: 'e.g. 15.5"',
    category: 'Topwear',
    gender: 'Male',
    description: 'Base of neck circumference (for Mandarin / Bandhgala / Shirt collar).',
  },
  {
    key: 'armhole',
    label: 'Armhole',
    sublabel: 'Shoulder socket',
    placeholder: 'e.g. 18.5"',
    category: 'Topwear',
    gender: 'Male',
    description: 'Shoulder socket circumference.',
  },
  {
    key: 'sleeveLength',
    label: 'Sleeve Length',
    sublabel: 'Shoulder to wrist',
    placeholder: 'e.g. 24.5"',
    category: 'Topwear',
    gender: 'Male',
    description: 'Shoulder edge over the elbow to the wrist bone.',
  },
  {
    key: 'bicep',
    label: 'Bicep Round',
    sublabel: 'Middle arm muscle',
    placeholder: 'e.g. 14"',
    category: 'Topwear',
    gender: 'Male',
    description: 'Muscle round around the middle arm.',
  },
  {
    key: 'wrist',
    label: 'Cuff / Wrist',
    sublabel: 'Wrist with ease',
    placeholder: 'e.g. 9"',
    category: 'Topwear',
    gender: 'Male',
    description: 'Wrist circumference with ease.',
  },
];

/**
 * 4. Gents Bottomwear (Pajama / Trouser / Churidar / Dhoti)
 */
export const GENTS_BOTTOMWEAR_FIELDS: MeasurementFieldDef[] = [
  {
    key: 'outseamLength',
    label: 'Outseam / Total Length',
    sublabel: 'Waist to shoe sole',
    placeholder: 'e.g. 40"',
    category: 'Bottomwear',
    gender: 'Male',
    description: 'Waistband down the outside edge of the leg to the shoe sole.',
  },
  {
    key: 'inseam',
    label: 'Inseam Length',
    sublabel: 'Crotch to hem',
    placeholder: 'e.g. 29.5"',
    category: 'Bottomwear',
    gender: 'Male',
    description: 'Crotch down the inner leg to the hem.',
  },
  {
    key: 'waist',
    label: 'Waist',
    sublabel: 'Fastening waist',
    placeholder: 'e.g. 34"',
    category: 'Bottomwear',
    gender: 'Male',
    description: 'Waistband circumference where the pant or drawstring is tied.',
  },
  {
    key: 'seatHip',
    label: 'Seat / Hip',
    sublabel: 'Round over buttocks',
    placeholder: 'e.g. 40"',
    category: 'Bottomwear',
    gender: 'Male',
    description: 'Widest round over the buttocks.',
  },
  {
    key: 'crotchFork',
    label: 'Crotch / Fork',
    sublabel: 'Rise depth',
    placeholder: 'e.g. 27"',
    category: 'Bottomwear',
    gender: 'Male',
    description: 'Rise depth measured front-to-back between legs.',
  },
  {
    key: 'thigh',
    label: 'Thigh Round',
    sublabel: 'Upper thigh width',
    placeholder: 'e.g. 24"',
    category: 'Bottomwear',
    gender: 'Male',
    description: 'Widest upper thigh circumference.',
  },
  {
    key: 'knee',
    label: 'Knee Round',
    sublabel: 'Middle leg round',
    placeholder: 'e.g. 18"',
    category: 'Bottomwear',
    gender: 'Male',
    description: 'Middle leg circumference.',
  },
  {
    key: 'bottomOpening',
    label: 'Bottom Opening / Cuff',
    sublabel: 'Ankle opening diameter',
    placeholder: 'e.g. 15"',
    category: 'Bottomwear',
    gender: 'Male',
    description: 'Opening diameter around the ankle.',
  },
];

/**
 * Combined list of all defined standard measurement keys & labels
 */
export const ALL_MEASUREMENT_FIELDS_MAP: Record<string, MeasurementFieldDef> = {
  ...LADIES_TOPWEAR_FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: f }), {}),
  ...LADIES_BOTTOMWEAR_FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: f }), {}),
  ...GENTS_TOPWEAR_FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: f }), {}),
  ...GENTS_BOTTOMWEAR_FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: f }), {}),
};

export const getMeasurementLabel = (key: string): string => {
  if (ALL_MEASUREMENT_FIELDS_MAP[key]) {
    return ALL_MEASUREMENT_FIELDS_MAP[key].label;
  }
  // Convert camelCase or snake_case to readable Title Case
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};
