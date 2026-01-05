from flask import Flask, request, jsonify
from flask_cors import CORS
from ytmusicapi import YTMusic

app = Flask(__name__)
CORS(app)

# Initialize YTMusic (unauthenticated guest session)
# For better results, use: YTMusic('headers_auth.json')
ytmusic = YTMusic()

@app.route('/api/music/search', methods=['GET'])
def search():
    query = request.args.get('q')
    if not query:
        return jsonify({'error': 'Query is required'}), 400

    # Search using multiple filters to get more comprehensive results
    filters = ['songs', 'videos', 'uploads']
    all_results = []

    for f in filters:
        try:
            results = ytmusic.search(query, filter=f, limit=50)
            all_results.extend(results)
        except Exception as e:
            print(f"Error fetching {f}: {e}")

    # Remove duplicates by videoId
    seen = set()
    simplified = []
    for item in all_results:
        video_id = item.get('videoId')
        if not video_id or video_id in seen:
            continue
        seen.add(video_id)

        simplified.append({
            'id': video_id,
            'title': item.get('title'),
            'artists': [a['name'] for a in item.get('artists', [])] if item.get('artists') else [],
            'thumbnail': item['thumbnails'][-1]['url'] if item.get('thumbnails') else '',
            'type': item.get('resultType', '')
        })

    return jsonify({'items': simplified})

if __name__ == '__main__':
    # Development mode only
    app.run(host='0.0.0.0', port=5001, debug=True)
