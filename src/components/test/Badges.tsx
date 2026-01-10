
import styles from "../pages/mainpage.module.css";


/* ---------- Small Components ---------- */

function Badge({ label }: { label: string }) {
  return <span className={styles.badge}>{label}</span>;
}

export default Badge;