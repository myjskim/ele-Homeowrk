import { GoogleGenAI, Type } from "@google/genai";
import { Question } from "../types";

/**
 * 과목의 성격과 학습 목표에 따라 Flash(빠름) 모델과 Pro(추론) 모델을 자동으로 스위칭합니다.
 */
export function getModelByContext(grade: string, subject: string, unitName: string): string {
  // 5~6학년 국어/사회는 복합 지문이 많으므로 Pro 권장
  if ((grade === '5학년' || grade === '6학년') && (subject === '국어' || subject === '사회')) {
    return 'gemini-3.1-pro-preview';
  }

  // 수학 중 논리적 추론이 필요한 특정 키워드 포함 시 Pro 권장
  const proKeywords = ['비와 비율', '겉넓이', '부피', '비례식', '추론', '논설문', '탐구 방법', '정치', '경제'];
  if (proKeywords.some(keyword => unitName.includes(keyword))) {
    return 'gemini-3.1-pro-preview';
  }

  // 그 외 기본 과목 및 저학년(1~4학년)은 속도가 빠른 Flash 권장
  return 'gemini-flash-latest';
}

export async function generateQuestions(
  apiKey: string,
  params: {
    grade: string;
    semester: string;
    subject: string;
    unit: string;
    difficulty: string;
    count: number;
  }
): Promise<{ questions: Question[]; model: string }> {
  const modelName = getModelByContext(params.grade, params.subject, params.unit);
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    초등학교 ${params.grade} ${params.semester} ${params.subject} 과목의 '${params.unit}' 단원에 대한 문제를 총 ${params.count}개 생성해줘.
    난이도는 '${params.difficulty}' 수준으로 해줘.
    
    각 문제는 다음 형식을 지켜줘:
    1. 문제 텍스트:
       - 대화문(A:, B:)이나 예시 문장이 포함된 경우, 반드시 줄바꿈을 사용하여 구분해줘.
       - 예: "다음 대화의 빈칸에 알맞은 말을 고르세요.\n\nA: What did you do yesterday?\nB: I ________ to the farm."와 같이 한 줄로 잇지 말고 명확히 구분해.
    2. 객관식인 경우 4개의 보기
    3. 정답
    4. 상세한 풀이 과정 및 설명:
       - **문단 구분 필수**: 교과서의 '약속하기'나 '핵심 개념' 정의 부분을 먼저 적고, **반드시 두 번의 줄바꿈(\\n\\n)**을 한 뒤에 해당 문제의 구체적인 풀이를 적어줘.
       - 개념 정의와 개별 풀이가 시각적으로 확실히 분리되게 해줘.
    5. 이미지 생성용 프롬프트: 문제 풀이에 시각적 자료가 **반드시** 필요한 경우에만 영어로 작성.
       - 단순 장식이나 추상적인 개념(예: 약수와 배수의 일반적인 관계 등)은 절대 이미지를 지시하지 마.
       - 매우 보수적으로 판단하여 정말 필요한 경우에만 프롬프트를 제공하고, 그렇지 않으면 null 또는 빈 문자열을 반환해.
  `;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING, description: "문제 내용" },
                options: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING },
                  description: "객관식 보기 (4개)"
                },
                answer: { type: Type.STRING, description: "정답" },
                explanation: { type: Type.STRING, description: "상세 설명" },
                imagePrompt: { type: Type.STRING, description: "이미지 생성을 위한 영어 프롬프트 (꼭 필요한 경우에만)" }
              },
              required: ["text", "answer", "explanation"]
            }
          }
        },
        required: ["questions"]
      }
    }
  });

  const result = JSON.parse(response.text);
  return { questions: result.questions, model: modelName };
}

export async function generateQuestionImage(
  apiKey: string,
  prompt: string
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  
  // Use the recommended image model from the skill
  const modelName = 'gemini-2.5-flash-image';
  
  const response = await ai.models.generateContent({
    model: modelName,
    contents: {
      parts: [
        { text: `Create an educational illustration for an elementary school workbook. Style: Clean, colorful, 2D vector art, friendly for children. Subject: ${prompt}` }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: "1K"
      }
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  
  throw new Error("Image generation failed");
}
