export default async function handler(req, res) {
  const token = process.env.NEXT_PUBLIC_SPORTMONKS_TOKEN;

  if (!token) {
    return res.status(500).json({ error: 'API Token is missing in Vercel Environment Variables' });
  }

  try {
    const url = `https://cricket.sportmonks.com/api/v2.0/livescores?api_token=${token}&include=localteam,visitorteam,runs`;
    const response = await fetch(url);
    const data = await response.json();

    // If Sportmonks returns an error (like expired token), pass it through
    if (data.error) {
      return res.status(401).json({ error: data.error });
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'System could not connect to Sportmonks' });
  }
}
