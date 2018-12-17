export const debounce = (f, delay) => {
	let call;
	let timeout;


	const ret = function(...args) {
		call = () => f.apply(this, args);
		clearTimeout(timeout);
		timeout = setTimeout(call, delay);
	};

	ret.flush = () => {
		clearTimeout(timeout);
		call();
	};

	return ret;
};

export const enqueue = (f) => {
	let promise = Promise.resolve(undefined);

	return function(...args) {
		promise = promise.then(f.apply(this, args));
	};
};
