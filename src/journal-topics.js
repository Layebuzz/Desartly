export function journalTopicId(label = 'Notes') {
  return label.normalize('NFKC').toLowerCase().replaceAll('&', '').trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
}
export function journalSearchText(value = '') {
  return value.normalize('NFKC').toLowerCase().replaceAll('ي', 'ی').replaceAll('ك', 'ک')
    .replace(/[\u064b-\u065f\u0670]/g, '').replace(/\u200c/g, ' ').trim();
}
