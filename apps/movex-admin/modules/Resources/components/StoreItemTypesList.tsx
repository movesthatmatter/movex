import Link from 'next/link';

type Props = {
  listTitle?: string;
  items: {
    name: string;
    hrefPath: string;
  }[];
  hrefBase?: string;
};

export const ResourceTypesList = ({
  listTitle,
  items,
  hrefBase = '/',
}: Props) => {
  if (items.length === 0) {
    return (
      <div>Count: 0</div>
    )
  }

  return (
    <div className="">
      {listTitle && <h5 className="text-xl font-bold pb-4">{listTitle}</h5>}
      {items.map((item) => (
        <Link
          key={item.hrefPath}
          className="block capitalize mb-2 hover:cursor-pointer hover:font-bold"
          href={`${hrefBase}/${item.hrefPath}`}
        >
          {item.name}
        </Link>
      ))}
    </div>
  );
};
