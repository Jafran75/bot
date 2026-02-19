function getContentType(filename) {
	const ext = filename.split('.').pop()?.toLowerCase();
	const mimeTypes = {
		'txt': 'text/plain',
		'html': 'text/html',
		'css': 'text/css',
		'js': 'application/javascript',
		'json': 'application/json',
		'png': 'image/png',
		'jpg': 'image/jpeg',
		'jpeg': 'image/jpeg',
		'gif': 'image/gif',
		'pdf': 'application/pdf',
		'zip': 'application/zip',
		'apk': 'application/vnd.android.package-archive',
	};
	return mimeTypes[ext] || 'application/octet-stream';
}
export async function onRequest(context) {
	const { env, params,request } = context;
	const path = Array.isArray(params.catchall) ? params.catchall.join('/') : params.catchall;
	if (!path) {
		return new Response("path not found", { status: 404 });
	}
	const objectKey = decodeURIComponent(path); // R2 对象键，如 ar001/my-app.apk
	const object = await env.apk.get(objectKey);
    if (!object) {
        return new Response("File not found", { status: 404 });
    }
	const filename= objectKey.split('/').pop(); // 获取文件名
	const contentType = getContentType(filename);
    return new Response(object.body, {
        status: 200,
        headers: {
			'Content-Type': contentType,
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Content-Length": object.size.toString(),
			'ETag': object.etag,
        },
    });
}
