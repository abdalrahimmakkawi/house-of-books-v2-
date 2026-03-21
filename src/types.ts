export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  cover_url: string;
  summary: string;
  key_insights: string;
  read_time_mins: number;
  language: string;
  created_at: string;
}

export interface Discussion {
  id: string;
  book_id: string;
  user_email: string;
  content: string;
  created_at: string;
}

export interface UserProfile {
  email: string;
  isAdmin: boolean;
  chatCount: number;
  lastChatReset: string;
}

export interface ReadingProgress {
  bookId: string;
  progress: number; // 0 to 100
  notes: string;
  isShelf: boolean;
}
