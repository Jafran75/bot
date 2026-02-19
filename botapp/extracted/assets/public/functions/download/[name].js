export async function onRequest(context) {
	const {params } = context;
	new Response(JSON.stringify(params), {
		status: 200,
		headers: {
			'content-type': 'application/json;charset=UTF-8',
			'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
		},
	})
}
