const StatCard = ({ icon, label, value, trend, color = 'red' }) => (
  <div className="stat-card">
    <div className={`stat-card__icon stat-card__icon--${color}`}>{icon}</div>
    <div>
      <div className="stat-card__label">{label}</div>
      <div className="stat-card__value">{value}</div>
      {trend && <div className="stat-card__trend">{trend}</div>}
    </div>
  </div>
);

export default StatCard;
