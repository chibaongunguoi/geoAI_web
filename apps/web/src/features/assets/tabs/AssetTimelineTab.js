import { dateLabel, display, ListEmpty } from "./utils";

export default function AssetTimelineTab({ timeline }) {
  return (
    <section className="asset-timeline" aria-label="Lịch sử hồ sơ">
      <h2>Lịch sử hồ sơ</h2>
      <ListEmpty items={timeline} message="Chưa có lịch sử hồ sơ." />
      {timeline.map((item) => (
        <article key={`${item.source}-${item.id}`} className="asset-timeline-item">
          <strong>{item.action}</strong>
          <span>{display(item.actor)}</span>
          <time dateTime={item.createdAt}>{dateLabel(item.createdAt)}</time>
        </article>
      ))}
    </section>
  );
}
