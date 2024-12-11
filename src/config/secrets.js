export function getCommonSecrets() {
    return [
        {
            name: 'DIAWI_TOKEN',
            value: process.env.DIAWI_TOKEN || ''
        },
        {
            name: 'KEYCHAIN_PASSWORD',
            value: process.env.KEYCHAIN_PASSWORD || ''
        },
        {
            name: 'SLACK_TOKEN',
            value: process.env.SLACK_TOKEN || ''
        },
        {
            name: 'UNITY_EMAIL',
            value: process.env.UNITY_EMAIL || ''
        },
        {
            name: 'UNITY_PASSWORD',
            value: process.env.UNITY_PASSWORD || ''
        }
    ];
}

export function getCommonVariables() {
    return [
        {
            name: 'UNITY_VERSION',
            value: process.env.UNITY_VERSION || '2022.3.50f1'
        }
    ];
}