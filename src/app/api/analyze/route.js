import { NextRequest, NextResponse } from 'next/server';

// Python GeoAI backend URL
const GEOAI_BACKEND_URL = process.env.GEOAI_BACKEND_URL || 'http://localhost:5000';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const image = formData.get('image');
    const bbox = formData.get('bbox');

    if (!image) {
      return NextResponse.json(
        { error: 'Không tìm thấy hình ảnh' },
        { status: 400 }
      );
    }

    // Convert image to buffer
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create FormData for Python backend
    const pythonFormData = new FormData();
    pythonFormData.append('image', new Blob([buffer], { type: 'image/png' }), 'captured_image.png');
    pythonFormData.append('bbox', bbox);

    console.log(`Forwarding request to GeoAI backend at ${GEOAI_BACKEND_URL}/analyze`);

    // Forward to Python GeoAI backend
    try {
      const response = await fetch(`${GEOAI_BACKEND_URL}/analyze`, {
        method: 'POST',
        body: pythonFormData,
        timeout: 30000, // 30 seconds timeout
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Backend returned ${response.status}: ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      
      return NextResponse.json({
        success: true,
        results: data.results
      });

    } catch (backendError) {
      console.error('Backend error:', backendError.message);
      
      // If Python backend is unavailable
      if (backendError.message.includes('ECONNREFUSED') || 
          backendError.message.includes('fetch')) {
        return NextResponse.json(
          { 
            error: 'GeoAI backend không khả dụng. Vui lòng kiểm tra xem Python server có đang chạy không.\n\nStartup: python geoai_backend.py' 
          },
          { status: 503 }
        );
      }
      
      throw backendError;
    }

  } catch (error) {
    console.error('Error processing image:', error);
    return NextResponse.json(
      { error: 'Lỗi xử lý hình ảnh: ' + error.message },
      { status: 500 }
    );
  }
}