export default function Midbar() {
  const stories = [
    { id: 1, name: 'user1', isAdd: true },
    { id: 2, name: 'user2' },
    { id: 3, name: 'user3' },
    { id: 4, name: 'user4' },
    { id: 5, name: 'user5' },
    { id: 6, name: 'user6' },
  ];

  return (
    <div className="flex mb-4 gap-4 p-3 bg-white rounded-md">
      {stories.map((story) => (
        <div key={story.id} className="flex flex-col items-center flex-1 max-w-[25%]">
          <div className="relative w-full h-[205px] bg-gray-300 rounded-xl flex items-center justify-center">
            {story.isAdd && (
              <span className="absolute bottom-1 left-1 flex items-center justify-center w-5 h-5 text-black bg-white border border-gray-400 rounded-full text-sm font-bold">
                +
              </span>
            )}
            <p className="text-xs font-semibold mt-1">{story.name}</p>
          </div>
          
        </div>
      ))}
    </div>
  );
}
