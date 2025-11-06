import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const { uri } = req.query;
    
    if (!uri || typeof uri !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid URI parameter'
      });
    }

    let nanopubContent = null;
    let contentType = null;

    // Try different fetch strategies
    const strategies = [
      // Strategy 1: Add .trig extension
      async () => {
        const trigUri = uri.endsWith('.trig') ? uri : `${uri}.trig`;
        console.log('Trying .trig:', trigUri);
        const response = await fetch(trigUri, {
          headers: {
            'Accept': 'application/trig, application/x-trig'
          },
          redirect: 'follow'
        });
        if (response.ok) {
          return { content: await response.text(), type: response.headers.get('content-type') };
        }
        return null;
      },
      
      // Strategy 2: Try original URI with TriG accept header
      async () => {
        console.log('Trying original URI with TriG accept:', uri);
        const response = await fetch(uri, {
          headers: {
            'Accept': 'application/trig, application/x-trig, application/n-quads'
          },
          redirect: 'follow'
        });
        if (response.ok) {
          return { content: await response.text(), type: response.headers.get('content-type') };
        }
        return null;
      },

      // Strategy 3: Convert w3id.org to registry URL directly
      async () => {
        if (uri.includes('w3id.org/np/')) {
          const npId = uri.split('/np/')[1];
          const registryUri = `https://registry.knowledgepixels.com/np/${npId}.trig`;
          console.log('Trying registry directly:', registryUri);
          const response = await fetch(registryUri, {
            headers: {
              'Accept': 'application/trig, application/x-trig'
            }
          });
          if (response.ok) {
            return { content: await response.text(), type: response.headers.get('content-type') };
          }
        }
        return null;
      },

      // Strategy 4: Try .nq (n-quads) format
      async () => {
        const nqUri = uri.replace(/\.trig$/, '') + '.nq';
        console.log('Trying .nq:', nqUri);
        const response = await fetch(nqUri, {
          headers: {
            'Accept': 'application/n-quads'
          },
          redirect: 'follow'
        });
        if (response.ok) {
          return { content: await response.text(), type: response.headers.get('content-type') };
        }
        return null;
      }
    ];

    // Try each strategy until one works
    for (const strategy of strategies) {
      try {
        const result = await strategy();
        if (result) {
          nanopubContent = result.content;
          contentType = result.type;
          break;
        }
      } catch (error) {
        console.warn('Strategy failed:', error);
        // Continue to next strategy
      }
    }

    if (!nanopubContent) {
      return res.status(404).json({
        success: false,
        error: 'Nanopublication not found. Tried multiple formats and servers.'
      });
    }

    return res.status(200).json({
      success: true,
      uri,
      content: nanopubContent,
      contentType
    });
  } catch (error) {
    console.error('Fetch error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
