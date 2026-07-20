export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { agent, prompt } = req.body;

  // Simple agent responses
  const responses = {
    'growth': `Based on your request for growth advice, here's a 90-day plan:\n\nDays 1-30: Foundation\n- Optimize onboarding flow\n- Implement referral program\n- Set up analytics\n\nDays 31-60: Scaling\n- Launch marketing campaigns\n- Expand to new channels\n- Optimize conversion rates\n\nDays 61-90: Optimization\n- Analyze performance metrics\n- Scale successful initiatives\n- Plan next quarter`,
    
    'revenue': `Revenue Analysis:\n\nCurrent MRR: $45,000\nChurn Rate: 3.2%\nNet Revenue Retention: 96.8%\n\nRecommendations:\n- Focus on reducing churn to <2%\n- Implement upselling strategies\n- Expand pricing tiers`,
    
    'marketing': `Marketing Copy Strategy:\n\nHeadline: Transform Your Business Today\n\nKey Benefits:\n• 10x ROI guaranteed\n• Results in 30 days\n• No risk trial\n\nCall to Action: Start Free Trial`,
    
    'pricing': `Pricing Strategy Recommendations:\n\nCurrent Analysis:\n- Entry tier: $29/mo\n- Growth tier: $99/mo\n- Enterprise: Custom\n\nOptimization:\n- Add annual billing (20% discount)\n- Implement usage-based pricing\n- Create team plans`,
    
    'product': `Product Roadmap:\n\nQ1: Core Features\n- Enhanced analytics\n- Team collaboration\n- Mobile app\n\nQ2: Advanced Features\n- AI integration\n- Custom workflows\n- API access\n\nQ3: Scale\n- Enterprise features\n- Advanced security\n- Global expansion`,
    
    'churn': `Churn Reduction Strategy:\n\nIdentify At-Risk Customers:\n- Low engagement last 30 days\n- Support tickets > 3/month\n- Usage decline > 20%\n\nRetention Tactics:\n- Personal outreach\n- Special offers\n- Feature training\n- Success check-ins`,
    
    'competitor': `Competitive Analysis:\n\nKey Competitors:\n- Company A: $50M funding, similar features\n- Company B: Strong enterprise focus\n- Company C: Better pricing\n\nOur Advantages:\n- Superior UX\n- Better support\n- More flexible`,
    
    'seo': `SEO & Content Strategy:\n\nKeyword Opportunities:\n- "business automation tool"\n- "team productivity software"\n- "workflow management"\n\nContent Plan:\n- Blog posts: 2x/week\n- Case studies: Monthly\n- Video tutorials: Weekly\n\nTechnical SEO:\n- Site speed optimization\n- Schema markup\n- Backlink building`
  };

  const response = responses[agent] || 'Agent not found. Please try: growth, revenue, marketing, pricing, product, churn, competitor, seo';
  
  res.status(200).json({ response });
}
