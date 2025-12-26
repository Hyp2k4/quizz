export type Language = 'en' | 'vi';

export const translations = {
  en: {
    navbar: {
      features: "Features",
      pricing: "Pricing",
      community: "Community",
      allCourses: "All Courses",
      createQuiz: "Create Quiz",
      myCourses: "My Created Quizzes",
      login: "Login",
      logout: "Logout",
      loginRequired: "You must be logged in to create a course.",
      cta: "Start Building Now",
      startQuiz: "Start Quiz Now",
    },
    hero: {
      badge: "The Future of Learning",
      title: "Master Your Knowledge",
      subtitle: "Create & Share Quizzes",
      desc: "Build comprehensive quizzes with AI-assisted tools. Support for multiple-choice, open-ended, and mixed questions. Import directly from DOCX.",
    },
    features: {
      smart: { title: "Smart Questions", desc: "Create closed, open, and mixed question types with advanced validation logic." },
      import: { title: "Quick Import", desc: "Upload your existing DOCX files and let our system automatically parse questions." },
      rich: { title: "Rich Content", desc: "Add hints, detailed explanations, and media to enhance the learning experience." }
    },
    builder: {
      untitled: "Untitled Quiz",
      descPlaceholder: "Add a description for your quiz...",
      importBtn: "Import DOCX",
      importing: "Importing...",
      addQuestion: "Add New Question",
      cancel: "Cancel",
      save: "Save Quiz",
      question: "Question",
      statement: "Statement",
      statementPlaceholder: "Type your question here...",
      options: "Options",
      optionPlaceholder: "Option",
      addOption: "Add Option",
      hint: "HINT",
      hintPlaceholder: "Optional hint for students...",
      explanation: "EXPLANATION",
      explanationPlaceholder: "Why is this correct?...",
      part1: "Part 1",
      part2: "Part 2",
      detailedAnswer: "Additional Written Answer",
      modelAnswer: "Model Answer (Keywords)",
      userAnswerPlaceholder: "User will type their answer here...",
      types: {
         single: "Single Choice",
         multiple: "Multiple Answers",
         open: "Open Ended",
         mixed: "Combined (Mix)"
      }
    }
  },
  vi: {
    navbar: {
      features: "Tính năng",
      pricing: "Bảng giá",
      community: "Cộng đồng",
      allCourses: "Khóa học",
      createQuiz: "Tạo Quiz",
      myCourses: "Quiz của tôi",
      login: "Đăng nhập",
      logout: "Đăng xuất",
      loginRequired: "Bạn cần đăng nhập để tạo khóa học.",
      cta: "Bắt đầu tạo ngay",
      startQuiz: "Bắt đầu làm bài ngay",
    },
    hero: {
      badge: "Tương lai của việc học",
      title: "Làm chủ kiến thức",
      subtitle: "Tạo & Chia sẻ Quiz",
      desc: "Xây dựng bộ câu hỏi toàn diện với công cụ hỗ trợ AI. Hỗ trợ câu hỏi trắc nghiệm, tự luận, và hỗn hợp. Nhập trực tiếp từ file DOCX.",
    },
    features: {
      smart: { title: "Câu hỏi thông minh", desc: "Tạo các loại câu hỏi đóng, mở và kết hợp với logic xác thực nâng cao." },
      import: { title: "Nhập nhanh", desc: "Tải lên tệp DOCX hiện có của bạn và để hệ thống tự động phân tích câu hỏi." },
      rich: { title: "Nội dung phong phú", desc: "Thêm gợi ý, giải thích chi tiết và phương tiện để nâng cao trải nghiệm học tập." }
    },
    builder: {
      untitled: "Quiz chưa có tên",
      descPlaceholder: "Thêm mô tả cho bài kiểm tra...",
      importBtn: "Nhập DOCX",
      importing: "Đang nhập...",
      addQuestion: "Thêm câu hỏi mới",
      cancel: "Hủy",
      save: "Lưu Quiz",
      question: "Câu hỏi",
      statement: "Nội dung câu hỏi",
      statementPlaceholder: "Nhập câu hỏi của bạn vào đây...",
      options: "Các lựa chọn",
      optionPlaceholder: "Lựa chọn",
      addOption: "Thêm lựa chọn",
      hint: "GỢI Ý",
      hintPlaceholder: "Gợi ý tùy chọn cho học sinh...",
      explanation: "GIẢI THÍCH",
      explanationPlaceholder: "Tại sao đáp án này đúng?...",
      part1: "Phần 1",
      part2: "Phần 2",
      detailedAnswer: "Câu trả lời chi tiết",
      modelAnswer: "Đáp án mẫu (keywords)",
      userAnswerPlaceholder: "Người dùng sẽ nhập câu trả lời tại đây...",
      types: {
         single: "Một đáp án",
         multiple: "Nhiều đáp án",
         open: "Tự luận",
         mixed: "Kết hợp"
      }
    }
  }
};
