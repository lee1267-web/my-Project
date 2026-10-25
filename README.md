# my-Project

사용자 제작 퀴즈 플랫폼 **퀴즈공방** 이 두 가지 버전으로 들어 있습니다. 기능·화면·보안 규칙·샘플 퀴즈(41세트, 2,050문제)는 같습니다.

| 폴더 | 언어 | 특징 |
|---|---|---|
| [`quiz-platform/`](quiz-platform/) | JavaScript | 설정이 가장 단순 |
| [`quiz-platform-ts/`](quiz-platform-ts/) | TypeScript (strict) | 타입 검사(`npm run typecheck`), 편집기 자동 완성 |

```bash
cd quiz-platform        # 또는 cd quiz-platform-ts
npm install
npm run dev:demo        # Firebase 없이 체험 (데이터는 이 브라우저에만 저장)
```

설치, Firebase 설정, 배포 방법은 각 폴더의 README 를 참고하세요.
- JavaScript 버전: [quiz-platform/README.md](quiz-platform/README.md)
- TypeScript 버전: [quiz-platform-ts/README.md](quiz-platform-ts/README.md)
