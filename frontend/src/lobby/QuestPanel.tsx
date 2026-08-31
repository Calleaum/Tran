// Le panneau de quêtes est conservé dans le hub, mais aucun système de
// quêtes n'existe : ni côté backend, ni en local (les quêtes locales et
// l'XP fictive qu'elles rapportaient ont été retirées). Il affiche donc un
// état vide tant qu'un vrai module de quêtes n'est pas branché.
export function QuestPanel() {
  return (
    <div className="quest-panel">
      <div className="quest-panel__title">Quêtes du jour</div>
      <p className="placeholder-note quest-panel__empty">
        Aucune quête disponible pour le moment.
      </p>
    </div>
  );
}
