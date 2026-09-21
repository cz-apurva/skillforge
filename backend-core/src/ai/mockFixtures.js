/**
 * Clearly labeled mock fixtures for local dev and isolated offline unit tests.
 * STRICT RULE: Only invoked when AI_MODE === 'mock'.
 * Every returned fixture carries explicit `ai_mode: 'mock'` and `is_mock: true` metadata.
 */

const MOCK_FIXTURES = {
  contentAnalyzer: {
    topic: 'Relational Database Engineering & Normalization Rigor',
    subtopics: [
      'Functional Dependencies & Armstrong Axioms',
      'Boyce-Codd Normal Form (BCNF)',
      'Third Normal Form (3NF) Synthesis',
      'Lossless-Join Decomposition & Chase Algorithm',
    ],
    difficulty: 'Intermediate',
    prerequisites: ['Relational Algebra', 'Basic SQL', 'Set Theory'],
    learning_outcomes: [
      'Differentiate between 3NF and BCNF violations with formal mathematical proofs.',
      'Compute the minimal canonical cover of a given set of functional dependencies.',
      'Decompose non-normalized schemas into BCNF preserving lossless joins.',
    ],
    reference_concepts: ['Armstrong Axioms', 'Transitive Dependency', 'Superkey', 'Prime Attribute', 'BCNF', '3NF'],
    extracted_summary: 'Comprehensive analysis of relational normalization principles, anomaly mitigation, and Boyce-Codd normal form decomposition.',
  },

  resourceCurator: {
    resources: [
      {
        id: 'res-mock-1',
        title: 'Interactive Normalization & Chase Matrix Decomposition Visualizer',
        type: 'INTERACTIVE_SANDBOX',
        relevance: 'Directly reinforces functional dependency decomposition and BCNF losslessness testing.',
        description: 'Step-by-step canonical cover computations and Chase algorithm matrix verification.',
        tags: ['BCNF', '3NF', 'Functional Dependencies'],
        source: 'SkillForge Resource Curator AI [MOCK]',
      },
      {
        id: 'res-mock-2',
        title: 'Raft Consensus & Distributed Log Replication Reference Sheet',
        type: 'CHEAT_SHEET',
        relevance: 'Essential companion for distributed ACID and fault tolerance modules.',
        description: 'Comprehensive quick reference covering leader election, quorum intersections, and split-brain safety.',
        tags: ['Raft', '2PC', 'ACID'],
        source: 'SkillForge Resource Curator AI [MOCK]',
      },
    ],
  },

  tutor: {
    reply: `Let's break this down Socratically:
1. Examine your functional dependency $X \\rightarrow Y$. What is the relationship between the determinant $X$ and the candidate keys of the relation?
2. In 3NF, what specific exemption is granted for prime attributes that BCNF strictly eliminates?
3. If every determinant must be a superkey, what happens to transitive dependencies in your decomposed schema?`,
    socratic_hint_mode: true,
    is_covered: true,
    guardrail_notice: 'SkillForge Socratic Guardrail: Guiding questions and conceptual hints only. Direct solution code is prohibited during active coursework.',
  },

  fairGrade: {
    maximum_marks: 10.0,
    total_marks: 8.5,
    percentage: 85.0,
    confidence_score: 0.95,
    requires_human_review: false,
    strengths: ['Accurate formal definition of functional dependencies', 'Clear explanation of BCNF anomaly elimination'],
    missing_concepts: [],
    feedback: 'Solid, well-reasoned response demonstrating strong comprehension of relational schema design.',
    criteria: [
      {
        criterion: 'Conceptual Correctness',
        max_marks: 5.0,
        awarded_marks: 4.5,
        evidence: 'Student correctly identified that BCNF requires every determinant to be a superkey.',
        reason: 'Accurate theoretical reasoning meeting exemplary rubric criteria.',
      },
      {
        criterion: 'Reasoning & Proof Rigor',
        max_marks: 5.0,
        awarded_marks: 4.0,
        evidence: 'Explained the Chase algorithm matrix test for lossless join decomposition.',
        reason: 'Thorough explanation of lossless join verification steps.',
      },
    ],
  },

  codeGrader: {
    readability_score: 9.2,
    naming_conventions_review: 'Exemplary naming conventions adhering to PEP 8 standards with descriptive identifiers (e.g. `detect_deadlock`, `wait_for_edges`).',
    code_structure_and_modularity: 'Clean separation of DFS cycle detection traversal and adjacency graph construction.',
    comments_and_documentation: 'Comprehensive docstrings detailing parameters, return types, and distributed probe assumptions.',
    time_complexity_assessment: 'O(V + E) linear time graph traversal, optimal for distributed dependency detection.',
    space_complexity_assessment: 'O(V) auxiliary recursion stack and visited bitmask.',
    edge_case_handling_analysis: 'Properly guards against disconnected graphs, self-loops, and empty process sets.',
    constructive_suggestions: [
      'Consider replacing recursive DFS with an iterative stack to guard against stack overflow for extremely deep recursion paths (V > 10,000).',
      'Add type annotations (e.g., `List[Tuple[int, int]]`) to further increase self-documenting code clarity.',
    ],
    qualitative_summary: 'Clean, robust, and well-modularized algorithmic implementation with optimal asymptotic complexity and clear variable naming.',
  },

  sandboxGenerator: {
    title: 'Distributed Deadlock Detection via Chandy-Misra-Haas Algorithm',
    problem_statement: 'In distributed operating systems, processes on different compute nodes may form circular wait-for dependencies leading to deadlock. Implement an algorithm to detect whether a directed wait-for graph contains at least one cycle.',
    difficulty: 'Intermediate',
    language: 'Python',
    constraints: 'Number of processes N <= 1000, Number of wait-for edges E <= 5000. Time Limit: 2.0s, Memory Limit: 256MB.',
    input_format: 'First line contains integer N (number of processes). Subsequent lines contain space-separated pairs u v indicating process u is waiting for process v.',
    output_format: 'Print "Deadlock Detected" if a cycle exists, otherwise print "No Deadlock".',
    starter_code: `import sys

def detect_deadlock(n, edges):
    """
    Detects if a distributed deadlock exists in the wait-for graph.
    :param n: Number of processes (1-indexed)
    :param edges: List of tuples (u, v) where u is waiting for v
    :return: True if cycle exists, False otherwise
    """
    # TODO: Implement cycle detection algorithm
    pass

if __name__ == '__main__':
    lines = sys.stdin.read().strip().split('\\n')
    if not lines or not lines[0]:
        print("No Deadlock")
        sys.exit(0)
    
    n = int(lines[0].strip())
    edges = []
    for line in lines[1:]:
        if line.strip():
            parts = line.strip().split()
            if len(parts) >= 2:
                edges.append((int(parts[0]), int(parts[1])))
    
    if detect_deadlock(n, edges):
        print("Deadlock Detected")
    else:
        print("No Deadlock")
`,
    reference_solution: `import sys

def detect_deadlock(n, edges):
    adj = {i: [] for i in range(1, n + 1)}
    for u, v in edges:
        if u in adj:
            adj[u].append(v)
    
    visited = [0] * (n + 1)
    rec_stack = [0] * (n + 1)
    
    def dfs(node):
        visited[node] = 1
        rec_stack[node] = 1
        for neighbor in adj.get(node, []):
            if not visited[neighbor]:
                if dfs(neighbor):
                    return True
            elif rec_stack[neighbor]:
                return True
        rec_stack[node] = 0
        return False
        
    for i in range(1, n + 1):
        if not visited[i]:
            if dfs(i):
                return True
    return False

if __name__ == '__main__':
    raw = sys.stdin.read().strip()
    if not raw:
        print("No Deadlock")
        sys.exit(0)
    lines = raw.split('\\n')
    n = int(lines[0].strip())
    edges = []
    for line in lines[1:]:
        parts = line.strip().split()
        if len(parts) >= 2:
            edges.append((int(parts[0]), int(parts[1])))
    
    if detect_deadlock(n, edges):
        print("Deadlock Detected")
    else:
        print("No Deadlock")
`,
    examples: [
      {
        input: '3\\n1 2\\n2 3\\n3 1',
        output: 'Deadlock Detected',
        explanation: 'Processes form a circular wait cycle: P1 -> P2 -> P3 -> P1.',
      },
      {
        input: '3\\n1 2\\n2 3',
        output: 'No Deadlock',
        explanation: 'Linear chain P1 -> P2 -> P3 contains no cycles.',
      },
    ],
    candidate_test_cases: [
      {
        id: 1,
        name: 'Sample Case 1: Simple 3-Node Cycle',
        input: '3\\n1 2\\n2 3\\n3 1',
        expected_output: 'Deadlock Detected',
        is_hidden: false,
        weight: 20,
        explanation: 'Classic circular deadlock dependency.',
      },
      {
        id: 2,
        name: 'Sample Case 2: Acyclic Directed Graph',
        input: '3\\n1 2\\n2 3',
        expected_output: 'No Deadlock',
        is_hidden: false,
        weight: 20,
        explanation: 'No back edges exist in DFS forest.',
      },
      {
        id: 3,
        name: 'Hidden Benchmark 1: Disconnected Subgraph with Cycle in Second Component',
        input: '5\\n1 2\\n3 4\\n4 5\\n5 3',
        expected_output: 'Deadlock Detected',
        is_hidden: true,
        weight: 20,
        explanation: 'Component {3, 4, 5} has cycle while {1, 2} is acyclic.',
      },
      {
        id: 4,
        name: 'Hidden Benchmark 2: Self-Loop Edge',
        input: '2\\n1 1',
        expected_output: 'Deadlock Detected',
        is_hidden: true,
        weight: 20,
        explanation: 'Single process waiting on its own lock.',
      },
      {
        id: 5,
        name: 'Hidden Benchmark 3: Complete DAG (No Cycles)',
        input: '4\\n1 2\\n1 3\\n1 4\\n2 3\\n2 4\\n3 4',
        expected_output: 'No Deadlock',
        is_hidden: true,
        weight: 20,
        explanation: 'Dense DAG with transitive edges but no directed cycles.',
      },
    ],
  },

  teacherCopilot: {
    top_weakness_concept: 'BCNF vs 3NF Dependency Preservation Trade-offs',
    student_deficiency_count: 5,
    priority: 'HIGH',
    deficiency_percentage: '71.4%',
    computed_evidence_summary: '71.4% of evaluated students (5/7) scored below 70% on Normalization & BCNF criteria.',
    suggested_action: 'Conduct a 10-minute recap focusing on why some 3NF schemas cannot achieve BCNF without losing functional dependencies.',
    suggested_discussion_starter: 'Why is it sometimes impossible to achieve both BCNF and dependency preservation simultaneously?',
    action_type: 'REVISE_TOPIC',
    recommended_resources: [
      { title: 'Decomposition Trade-offs Sandbox', type: 'INTERACTIVE_SANDBOX' },
      { title: '3-Question Formative Knowledge Check', type: 'QUIZ' },
    ],
    recommendations: [
      {
        id: 'rec-mock-1',
        topic: 'Relational Schema Normalization & BCNF',
        action_type: 'REVISE_TOPIC',
        title: 'Targeted Lecture Recap: BCNF Determinants & Prime Attribute Exemptions',
        priority: 'HIGH',
        deficiency_count: 5,
        deficiency_percentage: '71.4%',
        computed_evidence_summary: '71.4% of students scored below 70% on BCNF criterion evaluations with recurring Armstrong axiom misconceptions.',
        suggested_action: 'Conduct a 15-minute whiteboard session walking through minimal canonical cover computation and lossless join tests.',
        suggested_discussion_starter: 'Why does 3NF allow non-prime attributes to depend transitively on candidate keys while BCNF strictly eliminates all non-superkey determinants?',
        recommended_remedy: {
          type: 'SANDBOX',
          title: 'Interactive Normalization Decomposition Sandbox',
          url: '/student/sandbox',
        },
      },
      {
        id: 'rec-mock-2',
        topic: 'Distributed Deadlocks & Probe Routing',
        action_type: 'PUBLISH_EXAMPLE',
        title: 'Publish Step-by-Step Probe Routing Trace Example',
        priority: 'MEDIUM',
        deficiency_count: 3,
        deficiency_percentage: '42.9%',
        computed_evidence_summary: '42.9% of code submissions failed hidden benchmarks for multi-node cycle probe routing.',
        suggested_action: 'Publish a step-by-step Chandy-Misra-Haas probe message trace diagram to the classroom feed.',
        suggested_discussion_starter: 'How does an initiator distinguish between a genuine distributed cycle and an outdated probe message?',
        recommended_remedy: {
          type: 'RESOURCE',
          title: 'Distributed Probe Routing Reference Guide',
          url: '/resources/distributed-deadlocks',
        },
      },
    ],
  },
};

/**
 * Get labeled mock fixture for a given AI service
 */
function getMockFixture(serviceName) {
  const base = MOCK_FIXTURES[serviceName] || {
    status: 'MOCK_DATA',
    message: `Mock fixture data for ${serviceName}`,
  };

  return {
    ...base,
    ai_mode: 'mock',
    is_mock: true,
    mock_timestamp: new Date().toISOString(),
    engine: `SkillForge Mock Engine (${serviceName})`,
  };
}

module.exports = {
  MOCK_FIXTURES,
  getMockFixture,
};
