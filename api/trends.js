export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const trends = [
    {
      category: 'Reading Habits',
      trend: 'Digital Reading Up 45%',
      description: 'More readers prefer digital over physical books',
      growth: '+45%'
    },
    {
      category: 'AI Integration',
      trend: 'AI Book Recommendations',
      description: 'Personalized reading suggestions powered by machine learning',
      growth: '+120%'
    },
    {
      category: 'Social Reading',
      trend: 'Book Clubs Going Digital',
      description: 'Virtual discussion groups gain popularity',
      growth: '+67%'
    },
    {
      category: 'Audio Books',
      trend: 'Audio Content Consumption',
      description: 'Multi-format reading experiences on the rise',
      growth: '+89%'
    }
  ];

  res.status(200).json({ trends });
}
