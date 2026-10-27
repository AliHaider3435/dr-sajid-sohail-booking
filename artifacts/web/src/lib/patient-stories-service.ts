export type PatientStory = {
  id: string;
  patientName: string;
  context: string; // e.g. "Spine Surgery Patient · Layyah"
  treatment: string; // e.g. "Endoscopic Lumbar Spine Discectomy"
  message: string;
  rating: number; // 1 to 5
  mediaType: 'image' | 'video' | 'both' | 'none';
  imageUrl?: string;
  videoUrl?: string; // YouTube, Vimeo, or direct MP4 link
  date: string;
  isPublished: boolean;
  createdAt: string;
};

const STORAGE_KEY = 'dr_sajid_patient_stories_v1';

export const INITIAL_STORIES: PatientStory[] = [
  {
    id: 'story-1',
    patientName: 'Muhammad Usman',
    context: 'Spine Care Patient · Layyah',
    treatment: 'Endoscopic Lumbar Spine Surgery',
    message: 'I suffered from chronic back and sciatic pain for 2 years. After consulting Dr. Sajid Sohail at Rahmania Medical Center, I felt confident and understood every step. Within three weeks after the endoscopic procedure, I was back on my feet pain-free. A true blessing for our region.',
    rating: 5,
    mediaType: 'image',
    imageUrl: '/images/avatar-muhammad.jpg',
    date: 'October 2026',
    isPublished: true,
    createdAt: new Date('2026-10-01').toISOString(),
  },
  {
    id: 'story-2',
    patientName: 'Ayesha Bibi',
    context: 'Patient Family · Layyah',
    treatment: 'Brain Consultation & Surgery',
    message: 'Dr. Sajid Sohail explained my mother\'s condition in a gentle way our entire family could comprehend. His calmness and surgical precision transformed our hope into reality. The clinic coordination was flawless.',
    rating: 5,
    mediaType: 'image',
    imageUrl: '/images/avatar-ayesha.jpg',
    date: 'September 2026',
    isPublished: true,
    createdAt: new Date('2026-09-18').toISOString(),
  },
  {
    id: 'story-3',
    patientName: 'Tariq Mehmood',
    context: 'Cervical Spine Patient · DG Khan',
    treatment: 'Minimally Invasive Spine Treatment',
    message: 'Before visiting Dr. Sajid Sohail, I could barely sleep due to neck and arm numbness. His patient-first approach, thorough explanation of MRI scans, and dedicated care gave me my active life back.',
    rating: 5,
    mediaType: 'video',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Sample video link
    imageUrl: '/images/avatar-sana.jpg',
    date: 'August 2026',
    isPublished: true,
    createdAt: new Date('2026-08-22').toISOString(),
  },
];

export function getPatientStories(publishedOnly = false): PatientStory[] {
  if (typeof window === 'undefined') return INITIAL_STORIES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_STORIES));
      return publishedOnly ? INITIAL_STORIES.filter((s) => s.isPublished) : INITIAL_STORIES;
    }
    const stories: PatientStory[] = JSON.parse(raw);
    return publishedOnly ? stories.filter((s) => s.isPublished) : stories;
  } catch {
    return INITIAL_STORIES;
  }
}

export function savePatientStories(stories: PatientStory[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
  window.dispatchEvent(new CustomEvent('patient_stories_updated', { detail: stories }));
}

export function addPatientStory(story: Omit<PatientStory, 'id' | 'createdAt'>): PatientStory {
  const current = getPatientStories(false);
  const newStory: PatientStory = {
    ...story,
    id: `story-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  const updated = [newStory, ...current];
  savePatientStories(updated);
  return newStory;
}

export function updatePatientStory(id: string, updates: Partial<PatientStory>): void {
  const current = getPatientStories(false);
  const updated = current.map((s) => (s.id === id ? { ...s, ...updates } : s));
  savePatientStories(updated);
}

export function deletePatientStory(id: string): void {
  const current = getPatientStories(false);
  const updated = current.filter((s) => s.id !== id);
  savePatientStories(updated);
}
