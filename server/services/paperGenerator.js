/**
 * Question Paper Generator Engine for StudyTrack
 * Generates personalized, syllabus-bound examination papers.
 */

// Contextual question bank generators by category and cognitive bloom taxonomy
const QUESTION_PATTERNS = {
  mcq: [
    (topic) => ({
      type: 'MCQ',
      question: `Which of the following statements correctly characterizes "${topic}"?`,
      options: [
        `It defines fundamental operational boundaries and primary characteristics specific to ${topic}.`,
        `It operates exclusively under inverted polarity without external bias.`,
        `It eliminates all non-linear parasitic effects across high-frequency domains.`,
        `It operates independently of structural and geometric dimensions.`
      ],
      correctAnswer: 0,
      answerKey: `Option A is correct: It defines fundamental operational boundaries and primary characteristics specific to ${topic}.`,
      explanation: `In standard curriculum analysis, ${topic} focuses on intrinsic operating principles and core governing constraints.`
    }),
    (topic) => ({
      type: 'MCQ',
      question: `What is the primary governing factor or parameter associated with "${topic}"?`,
      options: [
        `Charge distribution and structural state variation in ${topic}`,
        `Complete thermal immunity irrespective of operating frequency`,
        `Absolute zero carrier concentration in transition states`,
        `Uniform static behavior with no dependent current-voltage variation`
      ],
      correctAnswer: 0,
      answerKey: `Option A is correct: Charge distribution and structural state variation in ${topic}.`,
      explanation: `Performance and physical mechanisms in ${topic} depend heavily on spatial charge dynamics and structural bias conditions.`
    }),
    (topic) => ({
      type: 'MCQ',
      question: `When analyzing "${topic}", what condition typically triggers a transition between operational states?`,
      options: [
        `Reaching critical threshold potential or design boundary conditions`,
        `Reduction of input signals to infinite impedance states`,
        `Instantaneous drop of total dissipation to zero`,
        `Complete inversion of material crystal structure`
      ],
      correctAnswer: 0,
      answerKey: `Option A is correct: Reaching critical threshold potential or design boundary conditions.`,
      explanation: `Operational thresholds determine state transitions and device/model switching dynamics for ${topic}.`
    })
  ],

  very_short: [
    (topic) => ({
      type: 'Very Short Answer',
      question: `Define "${topic}" and state its primary significance.`,
      answerKey: `Definition of ${topic}: Refers to the foundational concept/mechanism governing operation in the subject domain. Its primary significance is ensuring predictable performance, stability, and adherence to design specifications.`
    }),
    (topic) => ({
      type: 'Very Short Answer',
      question: `State the key mathematical or governing relationship associated with "${topic}".`,
      answerKey: `Key relationship: Relates input/boundary parameters to response characteristics for ${topic}, maintaining conservation of charge, energy, or signal fidelity.`
    }),
    (topic) => ({
      type: 'Very Short Answer',
      question: `Mention two practical limitations or constraints observed in "${topic}".`,
      answerKey: `1. Physical scaling or parasitic effects. 2. Operational stability limits under high stress or dynamic operating frequencies.`
    })
  ],

  short: [
    (topic) => ({
      type: 'Short Answer',
      question: `Explain the working principle and operational mechanism of "${topic}". Support your answer with relevant notes.`,
      answerKey: `Working Principle: Detail the step-by-step operating sequence of ${topic}. Discuss how initial conditions evolve under excitation, the transition state dynamics, and terminal outcomes.`
    }),
    (topic) => ({
      type: 'Short Answer',
      question: `Differentiate the behavior of "${topic}" under ideal conditions versus practical real-world conditions.`,
      answerKey: `Ideal vs Practical: Highlight idealized assumptions (linear response, zero loss, infinite bandwidth) versus practical non-idealities (leakage, thermal drift, noise margins) in ${topic}.`
    }),
    (topic) => ({
      type: 'Short Answer',
      question: `Derive or outline the expression governing the performance metrics of "${topic}".`,
      answerKey: `Derivation Outline: Establish initial equilibrium boundary equations, integrate across active physical regions, and deduce the standard formula for ${topic}.`
    })
  ],

  conceptual: [
    (topic) => ({
      type: 'Conceptual',
      question: `Critically evaluate why "${topic}" plays a critical role in system design. What consequences arise if its effects are neglected?`,
      answerKey: `Conceptual Breakdown: Neglecting ${topic} leads to degradation of efficiency, signal distortion, or threshold breakdown. Understanding it enables engineers to design robust compensation mechanisms.`
    }),
    (topic) => ({
      type: 'Conceptual',
      question: `Explain the cause-and-effect relationship between structural parameters and performance tradeoffs in "${topic}".`,
      answerKey: `Tradeoff Analysis: Increasing dimensions or drive levels improves certain margins while penalizing switching speed, power consumption, or silicon footprint in ${topic}.`
    })
  ],

  descriptive: [
    (topic) => ({
      type: 'Descriptive',
      question: `Provide a comprehensive analysis of "${topic}". Draw neat schematics/diagrams, explain the physical/theoretical underpinnings, and deduce the complete mathematical formulation.`,
      answerKey: `Comprehensive Analysis: 1. Introduction and physical schematic of ${topic}. 2. Step-by-step mathematical model and field equations. 3. Graphical plots of characteristics. 4. Advantages, industrial applications, and modern developments.`
    }),
    (topic) => ({
      type: 'Descriptive',
      question: `With the aid of characteristic curves and structural diagrams, explain the operation of "${topic}" across all operating regimes. Compare its performance with alternative contemporary techniques.`,
      answerKey: `Detailed Regimes: Describe linear/subthreshold, active/saturation, and breakdown zones. Provide comparative matrix contrasting ${topic} against legacy and competing architectures.`
    })
  ],

  numerical: [
    (topic) => ({
      type: 'Numerical',
      question: `For a system modeled around "${topic}", calculate the critical operating value given nominal standard parameters (assume typical baseline constants). Determine the percentage change if primary input parameters vary by ±15%.`,
      answerKey: `Numerical Solution: Apply governing formula for ${topic}. Step 1: Compute nominal metric. Step 2: Recalculate with shifted variables. Step 3: Compute sensitivity and percentage delta.`
    }),
    (topic) => ({
      type: 'Numerical',
      question: `Given an experimental test setup measuring "${topic}": evaluate the maximum permissible tolerance before distortion occurs. Formulate the required parameter adjustment to restore 95% nominal performance.`,
      answerKey: `Step-by-step numerical calculation applying standard characteristic equations of ${topic}.`
    })
  ],

  application: [
    (topic) => ({
      type: 'Application-based',
      question: `Design an engineering or analytical scenario where "${topic}" is utilized to solve high-efficiency constraints. Describe your architecture and justify the design choices.`,
      answerKey: `Application Architecture: 1. Problem formulation. 2. Implementation of ${topic} as core solution. 3. Verification of stability and compliance with performance criteria.`
    }),
    (topic) => ({
      type: 'Application-based',
      question: `In a modern industry deployment encountering performance degradation due to "${topic}", outline a diagnostic protocol and propose two corrective techniques.`,
      answerKey: `Diagnostic Protocol: Measurement methodologies, fault identification, compensation circuits/algorithms tailored specifically to ${topic}.`
    })
  ]
};

/**
 * Generate a complete, syllabus-bound paper
 * @param {Object} options
 * @param {Array<string>} options.topics - List of valid topic titles
 * @param {string} options.subjectName - Name of the subject
 * @param {string} options.subjectCode - Code of the subject
 * @param {number} options.totalMarks - e.g. 20, 30, 50, 100
 * @param {number} options.numQuestions - Target question count
 * @param {string} options.difficulty - 'Easy', 'Medium', 'Hard', 'Mixed'
 * @param {Array<string>} options.questionTypes - Selected types
 * @param {string} options.paperTitle - Custom title
 */
function generatePaper(options) {
  const {
    topics,
    subjectName,
    subjectCode = '',
    totalMarks = 30,
    numQuestions = 8,
    difficulty = 'Medium',
    questionTypes = ['mcq', 'short', 'conceptual', 'descriptive'],
    paperTitle = null
  } = options;

  if (!topics || topics.length === 0) {
    throw new Error('No eligible topics provided. Please complete topics or select valid topics.');
  }

  // Normalize requested types
  let activeTypes = questionTypes.map(t => t.toLowerCase().replace(/[\s-]/g, '_'));
  if (activeTypes.length === 0) {
    activeTypes = ['mcq', 'short', 'descriptive'];
  }

  // Filter available generators to matched active types
  let availableCategories = Object.keys(QUESTION_PATTERNS).filter(cat => {
    return activeTypes.includes(cat) || 
           (cat === 'very_short' && activeTypes.includes('very_short_answer')) ||
           (cat === 'application' && activeTypes.includes('application_based'));
  });

  if (availableCategories.length === 0) {
    availableCategories = ['mcq', 'short', 'conceptual', 'descriptive'];
  }

  const marksTarget = Math.max(10, parseInt(totalMarks, 10) || 30);
  const qCountTarget = Math.max(2, Math.min(30, parseInt(numQuestions, 10) || 8));

  // Determine section division and question allocation
  const questions = [];
  let currentMarks = 0;
  let qNum = 1;

  // Shuffle topics to distribute across questions
  const shuffledTopics = [...topics].sort(() => 0.5 - Math.random());
  let topicIdx = 0;

  for (let i = 0; i < qCountTarget; i++) {
    const topic = shuffledTopics[topicIdx % shuffledTopics.length];
    topicIdx++;

    // Pick category in balanced order
    const cat = availableCategories[i % availableCategories.length];
    const patterns = QUESTION_PATTERNS[cat] || QUESTION_PATTERNS['short'];
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];

    const qItem = pattern(topic);

    // Assign marks based on type and difficulty
    let qMarks = 2;
    if (qItem.type === 'MCQ' || qItem.type === 'Very Short Answer') {
      qMarks = difficulty === 'Easy' ? 1 : 2;
    } else if (qItem.type === 'Short Answer' || qItem.type === 'Conceptual') {
      qMarks = difficulty === 'Hard' ? 5 : 3;
    } else if (qItem.type === 'Descriptive' || qItem.type === 'Application-based') {
      qMarks = difficulty === 'Hard' ? 8 : 6;
    } else if (qItem.type === 'Numerical') {
      qMarks = 4;
    }

    questions.push({
      questionNumber: qNum++,
      topic: topic,
      type: qItem.type,
      marks: qMarks,
      question: qItem.question,
      options: qItem.options || null,
      correctAnswer: qItem.correctAnswer !== undefined ? qItem.correctAnswer : null,
      answerKey: qItem.answerKey,
      explanation: qItem.explanation || null
    });

    currentMarks += qMarks;
  }

  // Adjust marks proportionally to match marksTarget exactly
  if (currentMarks !== marksTarget && questions.length > 0) {
    const scale = marksTarget / currentMarks;
    let newTotal = 0;
    questions.forEach((q, idx) => {
      if (idx === questions.length - 1) {
        q.marks = Math.max(1, marksTarget - newTotal);
      } else {
        q.marks = Math.max(1, Math.round(q.marks * scale));
        newTotal += q.marks;
      }
    });
  }

  // Group into clean academic sections
  const sectionA = questions.filter(q => q.type === 'MCQ' || q.type === 'Very Short Answer');
  const sectionB = questions.filter(q => q.type === 'Short Answer' || q.type === 'Conceptual' || q.type === 'Numerical');
  const sectionC = questions.filter(q => q.type === 'Descriptive' || q.type === 'Application-based');

  const sections = [];
  if (sectionA.length > 0) {
    const totalA = sectionA.reduce((sum, q) => sum + q.marks, 0);
    sections.push({
      name: 'Section A: Objective & Fundamental Concepts',
      instructions: 'Answer all questions. Each question carries marks as indicated.',
      totalMarks: totalA,
      questions: sectionA
    });
  }

  if (sectionB.length > 0) {
    const totalB = sectionB.reduce((sum, q) => sum + q.marks, 0);
    sections.push({
      name: 'Section B: Short Analytical & Conceptual Questions',
      instructions: 'Answer clearly with relevant points and concise explanations.',
      totalMarks: totalB,
      questions: sectionB
    });
  }

  if (sectionC.length > 0) {
    const totalC = sectionC.reduce((sum, q) => sum + q.marks, 0);
    sections.push({
      name: 'Section C: Comprehensive, Descriptive & Application Questions',
      instructions: 'Provide in-depth solutions, diagrams, and systematic deductions where appropriate.',
      totalMarks: totalC,
      questions: sectionC
    });
  }

  // Calculate actual total marks across sections
  const finalTotalMarks = questions.reduce((sum, q) => sum + q.marks, 0);

  // Time calculation: approx 1.5 minutes per mark
  const suggestedMinutes = Math.min(180, Math.max(30, Math.round(finalTotalMarks * 1.8 / 5) * 5));

  const title = paperTitle || `${subjectName} Assessment (${difficulty} Level)`;

  return {
    title,
    subject: subjectName,
    subjectCode: subjectCode || '',
    date: new Date().toISOString().slice(0, 10),
    totalMarks: finalTotalMarks,
    timeAllowed: `${suggestedMinutes} Minutes`,
    difficulty,
    generalInstructions: [
      'Read all questions carefully before answering.',
      'All questions are compulsory in Section A.',
      'Neat sketches, block diagrams, and equations must be provided wherever applicable.',
      'Assume suitable missing data if necessary and state your assumptions clearly.'
    ],
    testedTopics: [...new Set(questions.map(q => q.topic))],
    sections,
    allQuestions: questions
  };
}

module.exports = {
  generatePaper
};
