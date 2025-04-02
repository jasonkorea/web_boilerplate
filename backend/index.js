const mode = process.argv[2] || 'http';

if (mode === 'https') {
    require('./https-server');
} else {
    require('./http-server');
}
