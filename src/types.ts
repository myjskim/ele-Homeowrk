export interface AppSettings {
  apiKey: string;
}

export type Grade = '1학년' | '2학년' | '3학년' | '4학년' | '5학년' | '6학년';
export type Semester = '1학기' | '2학기';
export type Subject = '국어' | '수학' | '영어' | '사회' | '과학';
export type Difficulty = '쉬움' | '보통' | '어려움';

export interface Question {
  text: string;
  options?: string[];
  answer: string;
  explanation: string;
  imageUrl?: string;
  imagePrompt?: string;
}

export interface Unit {
  id: string;
  name: string;
}
