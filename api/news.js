export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const news = [
    {
      id: 1,
      title: 'House of Books Launches AI-Powered Reading Experience',
      summary: 'Revolutionary platform combines literature with artificial intelligence',
      date: '2024-03-21',
      category: 'Product Launch'
    },
    {
      id: 2,
      title: 'User Base Grows to 10,000 Active Readers',
      summary: 'Milestone reached as platform expansion continues globally',
      date: '2024-03-20',
      category: 'Growth'
    },
    {
      id: 3,
      title: 'New Partnership with Major Publishers Announced',
      summary: 'Exclusive content deals bring bestselling titles to platform',
      date: '2024-03-19',
      category: 'Business'
    }
  ];

  res.status(200).json({ news });
}
